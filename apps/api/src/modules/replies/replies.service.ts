import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import { hasRole } from '../../auth/authenticated-user';
import {
  clampLimit,
  decodeCursor,
  encodeCursor,
} from '../../common/pagination/cursor';
import { EventsService } from '../../events/events.service';
import type { TenantContext } from '../../tenancy/tenant-query';
import { checkLimits, reportUsage } from '../common/limits';
import { beginWithSearchPath } from '../common/with-tx';
import { MentionsService } from '../mentions/mentions.service';
import { PostsRepository } from '../posts/posts.repository';
import type { CreateReplyDto } from './dto/create-reply.dto';
import type { ListRepliesQuery } from './dto/list-replies.query';
import type { ReplyDto, ReplyListResponse } from './dto/reply.response';
import {
  normalizeReply,
  RepliesRepository,
  toReplyDto,
} from './replies.repository';

@Injectable()
export class RepliesService {
  private readonly logger = new Logger(RepliesService.name);

  constructor(
    private readonly replies: RepliesRepository,
    private readonly posts: PostsRepository,
    private readonly mentions: MentionsService,
    private readonly events: EventsService,
  ) {}

  async list(
    user: AuthenticatedUser,
    tenant: TenantContext,
    postId: string,
    query: ListRepliesQuery,
  ): Promise<ReplyListResponse> {
    const post = await this.posts.findByIdRaw(tenant, postId);
    if (!post || post.deleted_at) {
      throw new NotFoundException({
        code: 'FORUM_POST_NOT_FOUND',
        message: 'Post not found',
      });
    }

    const limit = clampLimit(query.limit);
    // For top-sort we piggyback the upvote anchor on the base64 cursor via a
    // `<base64>#<upvotes>` suffix so we don't have to widen the CursorPayload.
    let baseCursor = query.cursor ?? null;
    let anchor: number | undefined;
    if (baseCursor && baseCursor.includes('#')) {
      const [left, right] = baseCursor.split('#');
      baseCursor = left;
      const maybe = Number(right);
      if (Number.isFinite(maybe)) anchor = maybe;
    }
    const decoded = baseCursor ? decodeCursor(baseCursor) : null;
    const cursor = decoded
      ? { id: decoded.id, createdAt: decoded.createdAt, anchor }
      : undefined;

    const rows = await this.replies.listForPost(tenant, {
      postId,
      sort: query.sort,
      limit,
      cursor,
      viewerUserId: user.platformUserId,
    });

    const slice = rows.slice(0, limit).map(normalizeReply);
    const nextRaw = rows.length > limit ? normalizeReply(rows[limit]) : null;

    const items: ReplyDto[] = slice.map(toReplyDto);
    let nextCursor: string | null = null;
    if (nextRaw) {
      const base = encodeCursor({
        id: nextRaw.id,
        createdAt: nextRaw.created_at.toISOString(),
      });
      nextCursor = query.sort === 'top' ? `${base}#${nextRaw.upvote_count}` : base;
    }

    return { items, nextCursor };
  }

  async create(
    user: AuthenticatedUser,
    tenant: TenantContext,
    postId: string,
    dto: CreateReplyDto,
    correlationId: string,
  ): Promise<ReplyDto> {
    await checkLimits({ user, action: 'forum.reply.create' });

    const post = await this.posts.findByIdRaw(tenant, postId);
    if (!post || post.deleted_at) {
      throw new NotFoundException({
        code: 'FORUM_POST_NOT_FOUND',
        message: 'Post not found',
      });
    }
    if (post.is_locked && !hasRole(user, 'MODERATOR')) {
      throw new ForbiddenException({
        code: 'FORUM_POST_LOCKED',
        message: 'Post is locked',
      });
    }

    // Depth handling: parent? min(parent.depth+1, 2) else 1.
    // Level-3 "parents" flatten to their level-2 grandparent so the final
    // depth stays at 2.
    let parentIdToUse: string | null = null;
    let depth: 1 | 2 = 1;
    if (dto.parentReplyId) {
      const parent = await this.replies.findByIdRaw(tenant, dto.parentReplyId);
      if (!parent || parent.deleted_at || parent.post_id !== postId) {
        throw new NotFoundException({
          code: 'FORUM_REPLY_NOT_FOUND',
          message: 'Parent reply not found on this post',
        });
      }
      if (parent.depth >= 2) {
        parentIdToUse = parent.parent_reply_id ?? parent.id;
        depth = 2;
      } else {
        parentIdToUse = parent.id;
        depth = 2;
      }
    }

    const runner = tenant.queryRunner;
    await beginWithSearchPath(tenant);
    let row;
    try {
      row = await this.replies.insert(tenant, {
        postId,
        parentReplyId: parentIdToUse,
        depth,
        authorUserId: user.platformUserId,
        body: dto.body,
      });
      await this.posts.incrementReplyCount(tenant, postId, 1);
      await runner.query('COMMIT');
    } catch (err) {
      await runner.query('ROLLBACK').catch(() => undefined);
      throw err;
    }

    await reportUsage({ user, action: 'forum.reply.create' });

    await this.mentions
      .recordAndEmit({
        tenant,
        sourceType: 'reply',
        sourceId: row.id,
        body: dto.body,
        actorPlatformUserId: user.platformUserId,
        correlationId,
        eventContext: { postId, replyId: row.id },
      })
      .catch((err) =>
        this.logger.warn(
          `mention recording failed for reply ${row.id}: ${(err as Error).message}`,
        ),
      );

    await this.events
      .publish({
        eventType: 'forum.reply.created',
        communityCode: tenant.communityCode,
        actorUserId: user.platformUserId,
        correlationId,
        payload: {
          replyId: row.id,
          postId,
          parentReplyId: parentIdToUse,
          depth,
          authorId: user.platformUserId,
        },
      })
      .catch((err) =>
        this.logger.warn(
          `forum.reply.created publish failed: ${(err as Error).message}`,
        ),
      );

    const norm = normalizeReply({ ...row, viewer_upvoted: false });
    return toReplyDto(norm);
  }

  async remove(
    user: AuthenticatedUser,
    tenant: TenantContext,
    replyId: string,
    correlationId: string,
  ): Promise<{ ok: true }> {
    await checkLimits({ user, action: 'forum.reply.delete' });
    const existing = await this.replies.findByIdRaw(tenant, replyId);
    if (!existing || existing.deleted_at) {
      throw new NotFoundException({
        code: 'FORUM_REPLY_NOT_FOUND',
        message: 'Reply not found',
      });
    }
    const isAuthor = existing.author_user_id === user.platformUserId;
    if (!isAuthor && !hasRole(user, 'MODERATOR')) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only the author or a moderator can delete this reply',
      });
    }

    const runner = tenant.queryRunner;
    await beginWithSearchPath(tenant);
    try {
      await this.replies.softDelete(tenant, replyId);
      await this.posts.incrementReplyCount(tenant, existing.post_id, -1);
      await runner.query('COMMIT');
    } catch (err) {
      await runner.query('ROLLBACK').catch(() => undefined);
      throw err;
    }

    await reportUsage({ user, action: 'forum.reply.delete' });

    await this.events
      .publish({
        eventType: 'forum.reply.deleted',
        communityCode: tenant.communityCode,
        actorUserId: user.platformUserId,
        correlationId,
        payload: { replyId, postId: existing.post_id },
      })
      .catch((err) =>
        this.logger.warn(
          `forum.reply.deleted publish failed: ${(err as Error).message}`,
        ),
      );

    return { ok: true };
  }
}
