import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import {
  decodeCursor,
  encodeCursor,
  clampLimit,
} from '../../common/pagination/cursor';
import { EventsService } from '../../events/events.service';
import type { TenantContext } from '../../tenancy/tenant-query';
import { hasRole } from '../../auth/authenticated-user';
import { checkLimits, reportUsage } from '../common/limits';
import { beginWithSearchPath } from '../common/with-tx';
import { MentionsService } from '../mentions/mentions.service';
import { TagsRepository, tagRowToDto } from '../tags/tags.repository';
import type { CreatePostDto } from './dto/create-post.dto';
import type { ListPostsQuery } from './dto/list-posts.query';
import type {
  PostDetailDto,
  PostListResponse,
  PostSummaryDto,
} from './dto/post.response';
import type { UpdatePostDto } from './dto/update-post.dto';
import { normalizeRow, toPostDetail, toPostSummary } from './posts.mapper';
import { PostsRepository } from './posts.repository';

/** 10-minute post-edit window for the original author. */
const EDIT_WINDOW_MS = 10 * 60 * 1000;

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    private readonly posts: PostsRepository,
    private readonly tags: TagsRepository,
    private readonly mentions: MentionsService,
    private readonly events: EventsService,
  ) {}

  async list(
    user: AuthenticatedUser,
    tenant: TenantContext,
    query: ListPostsQuery,
  ): Promise<PostListResponse> {
    const limit = clampLimit(query.limit);
    const cursor = query.cursor ? decodeCursor(query.cursor) ?? undefined : undefined;

    const rows = await this.posts.list(tenant, {
      sort: query.sort,
      window: query.window,
      tagSlug: query.tag,
      limit,
      cursor: cursor
        ? { id: cursor.id, createdAt: cursor.createdAt }
        : undefined,
      viewerUserId: user.platformUserId,
    });

    const slice = rows.slice(0, limit).map(normalizeRow);
    const nextRaw = rows.length > limit ? rows[limit] : null;

    const tagsByPost = await this.posts.loadTagsForPosts(
      tenant,
      slice.map((r) => r.id),
    );

    const items: PostSummaryDto[] = slice.map((row) =>
      toPostSummary(row, (tagsByPost.get(row.id) ?? []).map(tagRowToDto)),
    );

    const nextCursor = nextRaw
      ? encodeCursor({
          id: nextRaw.id,
          createdAt: new Date(nextRaw.created_at).toISOString(),
        })
      : null;

    return { items, nextCursor };
  }

  async findById(
    user: AuthenticatedUser,
    tenant: TenantContext,
    postId: string,
  ): Promise<PostDetailDto> {
    const row = await this.posts.findByIdWithViewer(
      tenant,
      postId,
      user.platformUserId,
    );
    if (!row) {
      throw new NotFoundException({
        code: 'FORUM_POST_NOT_FOUND',
        message: 'Post not found',
      });
    }
    const norm = normalizeRow(row);
    const tagsByPost = await this.posts.loadTagsForPosts(tenant, [norm.id]);
    const tags = (tagsByPost.get(norm.id) ?? []).map(tagRowToDto);
    return toPostDetail(norm, tags);
  }

  async create(
    user: AuthenticatedUser,
    tenant: TenantContext,
    dto: CreatePostDto,
    correlationId: string,
  ): Promise<PostDetailDto> {
    await checkLimits({ user, action: 'forum.post.create' });

    // Validate tag ids belong to this community schema before opening the tx.
    const tags = await this.tags.findByIds(tenant, dto.tagIds);
    if (tags.length !== new Set(dto.tagIds).size) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'One or more tags do not exist in this community',
      });
    }

    const runner = tenant.queryRunner;
    await beginWithSearchPath(tenant);
    let row;
    try {
      row = await this.posts.insert(tenant, {
        authorUserId: user.platformUserId,
        title: dto.title,
        body: dto.body,
      });
      await this.posts.attachTags(tenant, row.id, dto.tagIds);
      await runner.query('COMMIT');
    } catch (err) {
      await runner.query('ROLLBACK').catch(() => undefined);
      throw err;
    }

    await reportUsage({ user, action: 'forum.post.create' });

    // Post-commit side effects
    await this.mentions
      .recordAndEmit({
        tenant,
        sourceType: 'post',
        sourceId: row.id,
        body: dto.body,
        actorPlatformUserId: user.platformUserId,
        correlationId,
        eventContext: { postId: row.id },
      })
      .catch((err) =>
        this.logger.warn(
          `mention recording failed for post ${row.id}: ${(err as Error).message}`,
        ),
      );

    await this.events
      .publish({
        eventType: 'forum.post.created',
        communityCode: tenant.communityCode,
        actorUserId: user.platformUserId,
        correlationId,
        payload: {
          postId: row.id,
          authorId: user.platformUserId,
          title: row.title,
          tagIds: dto.tagIds,
        },
      })
      .catch((err) =>
        this.logger.warn(
          `forum.post.created publish failed: ${(err as Error).message}`,
        ),
      );

    const tagDtos = tags.map(tagRowToDto);
    const detailRow = { ...normalizeRow(row), viewer_upvoted: false };
    return toPostDetail(detailRow, tagDtos);
  }

  async update(
    user: AuthenticatedUser,
    tenant: TenantContext,
    postId: string,
    dto: UpdatePostDto,
    correlationId: string,
  ): Promise<PostDetailDto> {
    await checkLimits({ user, action: 'forum.post.update' });

    const existing = await this.posts.findByIdRaw(tenant, postId);
    if (!existing || existing.deleted_at) {
      throw new NotFoundException({
        code: 'FORUM_POST_NOT_FOUND',
        message: 'Post not found',
      });
    }
    const isAuthor = existing.author_user_id === user.platformUserId;
    const canModerate = hasRole(user, 'MODERATOR');
    if (!isAuthor && !canModerate) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only the author or a moderator can edit this post',
      });
    }
    if (existing.is_locked && !canModerate) {
      throw new ForbiddenException({
        code: 'FORUM_POST_LOCKED',
        message: 'Post is locked',
      });
    }
    if (isAuthor && !canModerate) {
      const age = Date.now() - new Date(existing.created_at).getTime();
      if (age > EDIT_WINDOW_MS) {
        throw new ForbiddenException({
          code: 'EDIT_WINDOW_EXPIRED',
          message: 'Edit window has expired',
        });
      }
    }

    if (dto.tagIds) {
      const tagRows = await this.tags.findByIds(tenant, dto.tagIds);
      if (tagRows.length !== new Set(dto.tagIds).size) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'One or more tags do not exist in this community',
        });
      }
    }

    const runner = tenant.queryRunner;
    await beginWithSearchPath(tenant);
    let updated;
    try {
      updated = await this.posts.update(tenant, postId, {
        title: dto.title,
        body: dto.body,
      });
      if (dto.tagIds) {
        await this.posts.replaceTags(tenant, postId, dto.tagIds);
      }
      await runner.query('COMMIT');
    } catch (err) {
      await runner.query('ROLLBACK').catch(() => undefined);
      throw err;
    }

    await reportUsage({ user, action: 'forum.post.update' });

    await this.events
      .publish({
        eventType: 'forum.post.updated',
        communityCode: tenant.communityCode,
        actorUserId: user.platformUserId,
        correlationId,
        payload: { postId },
      })
      .catch((err) =>
        this.logger.warn(
          `forum.post.updated publish failed: ${(err as Error).message}`,
        ),
      );

    return this.findById(user, tenant, updated.id);
  }

  async remove(
    user: AuthenticatedUser,
    tenant: TenantContext,
    postId: string,
    correlationId: string,
  ): Promise<{ ok: true }> {
    await checkLimits({ user, action: 'forum.post.delete' });
    const existing = await this.posts.findByIdRaw(tenant, postId);
    if (!existing || existing.deleted_at) {
      throw new NotFoundException({
        code: 'FORUM_POST_NOT_FOUND',
        message: 'Post not found',
      });
    }
    const isAuthor = existing.author_user_id === user.platformUserId;
    const canModerate = hasRole(user, 'MODERATOR');
    if (!isAuthor && !canModerate) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only the author or a moderator can delete this post',
      });
    }

    await this.posts.softDelete(tenant, postId);
    await reportUsage({ user, action: 'forum.post.delete' });

    await this.events
      .publish({
        eventType: 'forum.post.deleted',
        communityCode: tenant.communityCode,
        actorUserId: user.platformUserId,
        correlationId,
        payload: { postId },
      })
      .catch((err) =>
        this.logger.warn(
          `forum.post.deleted publish failed: ${(err as Error).message}`,
        ),
      );

    return { ok: true };
  }
}
