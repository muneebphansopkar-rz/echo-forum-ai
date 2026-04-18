import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import {
  clampLimit,
  decodeCursor,
  encodeCursor,
} from '../../common/pagination/cursor';
import { EventsService } from '../../events/events.service';
import type { TenantContext } from '../../tenancy/tenant-query';
import { checkLimits, reportUsage } from '../common/limits';
import { PostsRepository } from '../posts/posts.repository';
import { RepliesRepository } from '../replies/replies.repository';
import { TagsRepository } from '../tags/tags.repository';
import type {
  HideContentDto,
  QueueBucket,
  QueueCountsDto,
  QueueItemDto,
  QueueListResponse,
  QueueQuery,
  RetagDto,
  ToggleLockDto,
  TogglePinDto,
} from './dto/moderation.dto';
import { ModerationRepository } from './moderation.repository';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    private readonly mod: ModerationRepository,
    private readonly posts: PostsRepository,
    private readonly replies: RepliesRepository,
    private readonly tags: TagsRepository,
    private readonly events: EventsService,
  ) {}

  async togglePin(
    user: AuthenticatedUser,
    tenant: TenantContext,
    postId: string,
    dto: TogglePinDto,
    correlationId: string,
  ): Promise<{ ok: true; pinned: boolean }> {
    await checkLimits({ user, action: 'forum.moderation.pin' });
    const post = await this.posts.findByIdRaw(tenant, postId);
    if (!post || post.deleted_at) {
      throw new NotFoundException({
        code: 'FORUM_POST_NOT_FOUND',
        message: 'Post not found',
      });
    }
    await this.posts.setPinned(tenant, postId, dto.pinned);
    await this.mod.record(tenant, {
      actorUserId: user.platformUserId,
      action: dto.pinned ? 'pin' : 'unpin',
      targetType: 'post',
      targetId: postId,
    });
    await reportUsage({ user, action: 'forum.moderation.pin' });
    await this.emit(
      'forum.post.pinned',
      tenant,
      user,
      correlationId,
      { postId, pinned: dto.pinned },
    );
    return { ok: true, pinned: dto.pinned };
  }

  async toggleLock(
    user: AuthenticatedUser,
    tenant: TenantContext,
    postId: string,
    dto: ToggleLockDto,
    correlationId: string,
  ): Promise<{ ok: true; locked: boolean }> {
    await checkLimits({ user, action: 'forum.moderation.lock' });
    const post = await this.posts.findByIdRaw(tenant, postId);
    if (!post || post.deleted_at) {
      throw new NotFoundException({
        code: 'FORUM_POST_NOT_FOUND',
        message: 'Post not found',
      });
    }
    await this.posts.setLocked(tenant, postId, dto.locked);
    await this.mod.record(tenant, {
      actorUserId: user.platformUserId,
      action: dto.locked ? 'lock' : 'unlock',
      targetType: 'post',
      targetId: postId,
    });
    await reportUsage({ user, action: 'forum.moderation.lock' });
    await this.emit(
      'forum.post.locked',
      tenant,
      user,
      correlationId,
      { postId, locked: dto.locked },
    );
    return { ok: true, locked: dto.locked };
  }

  /**
   * Moderator tag override. Replaces the full tag list on a post with
   * `dto.tagIds` (1..3 uuids). Writes a `tag_override` row to the audit
   * trail carrying the before/after tag sets so the mod queue can render
   * the diff.
   */
  async retag(
    user: AuthenticatedUser,
    tenant: TenantContext,
    postId: string,
    dto: RetagDto,
    correlationId: string,
  ): Promise<{ ok: true; tagIds: string[] }> {
    await checkLimits({ user, action: 'forum.moderation.retag' });

    const post = await this.posts.findByIdRaw(tenant, postId);
    if (!post || post.deleted_at) {
      throw new NotFoundException({
        code: 'FORUM_POST_NOT_FOUND',
        message: 'Post not found',
      });
    }

    // Guard: every tag id must belong to this community schema.
    const uniqueNext = [...new Set(dto.tagIds)];
    const found = await this.tags.findByIds(tenant, uniqueNext);
    if (found.length !== uniqueNext.length) {
      throw new BadRequestException({
        code: 'FORUM_UNKNOWN_TAG',
        message: 'One or more tag ids are not part of this community',
      });
    }

    // Snapshot the current tag set for the audit log.
    const prevRows = (await tenant.queryRunner.query(
      `SELECT tag_id FROM forum_post_tags WHERE post_id = $1::uuid`,
      [postId],
    )) as Array<{ tag_id: string }>;
    const previousTagIds = prevRows.map((r) => r.tag_id);

    await this.posts.replaceTags(tenant, postId, uniqueNext);
    await this.mod.record(tenant, {
      actorUserId: user.platformUserId,
      action: 'tag_override',
      targetType: 'post',
      targetId: postId,
      metadata: {
        previousTagIds,
        nextTagIds: uniqueNext,
        supplied: dto.previousTagIds ?? null,
      },
    });

    await reportUsage({ user, action: 'forum.moderation.retag' });
    await this.emit('forum.moderation.action', tenant, user, correlationId, {
      action: 'tag_override',
      targetType: 'post',
      targetId: postId,
      previousTagIds,
      nextTagIds: uniqueNext,
    });

    return { ok: true, tagIds: uniqueNext };
  }

  async hide(
    user: AuthenticatedUser,
    tenant: TenantContext,
    targetType: 'post' | 'reply',
    targetId: string,
    dto: HideContentDto,
    correlationId: string,
  ): Promise<{ ok: true }> {
    await checkLimits({ user, action: 'forum.moderation.hide' });
    const now = new Date();
    if (targetType === 'post') {
      const post = await this.posts.findByIdRaw(tenant, targetId);
      if (!post || post.deleted_at) {
        throw new NotFoundException({
          code: 'FORUM_POST_NOT_FOUND',
          message: 'Post not found',
        });
      }
      await this.posts.setHidden(tenant, targetId, {
        hiddenAt: now,
        hiddenByUserId: user.platformUserId,
        reason: dto.reason ?? null,
      });
    } else {
      const reply = await this.replies.findByIdRaw(tenant, targetId);
      if (!reply || reply.deleted_at) {
        throw new NotFoundException({
          code: 'FORUM_REPLY_NOT_FOUND',
          message: 'Reply not found',
        });
      }
      await this.replies.setHidden(tenant, targetId, {
        hiddenAt: now,
        hiddenByUserId: user.platformUserId,
        reason: dto.reason ?? null,
      });
    }
    await this.mod.record(tenant, {
      actorUserId: user.platformUserId,
      action: 'hide',
      targetType,
      targetId,
      reason: dto.reason ?? null,
    });
    await reportUsage({ user, action: 'forum.moderation.hide' });
    await this.emit(
      'forum.content.hidden',
      tenant,
      user,
      correlationId,
      { targetType, targetId, reason: dto.reason ?? null },
    );
    return { ok: true };
  }

  async restore(
    user: AuthenticatedUser,
    tenant: TenantContext,
    targetType: 'post' | 'reply',
    targetId: string,
    correlationId: string,
  ): Promise<{ ok: true }> {
    await checkLimits({ user, action: 'forum.moderation.restore' });
    if (targetType === 'post') {
      const post = await this.posts.findByIdRaw(tenant, targetId);
      if (!post) {
        throw new NotFoundException({
          code: 'FORUM_POST_NOT_FOUND',
          message: 'Post not found',
        });
      }
      await this.posts.setHidden(tenant, targetId, {
        hiddenAt: null,
        hiddenByUserId: null,
        reason: null,
      });
    } else {
      const reply = await this.replies.findByIdRaw(tenant, targetId);
      if (!reply) {
        throw new NotFoundException({
          code: 'FORUM_REPLY_NOT_FOUND',
          message: 'Reply not found',
        });
      }
      await this.replies.setHidden(tenant, targetId, {
        hiddenAt: null,
        hiddenByUserId: null,
        reason: null,
      });
    }
    await this.mod.record(tenant, {
      actorUserId: user.platformUserId,
      action: 'restore',
      targetType,
      targetId,
    });
    await reportUsage({ user, action: 'forum.moderation.restore' });
    await this.emit(
      'forum.content.restored',
      tenant,
      user,
      correlationId,
      { targetType, targetId },
    );
    return { ok: true };
  }

  async queue(
    tenant: TenantContext,
    query: QueueQuery,
  ): Promise<QueueListResponse> {
    const limit = clampLimit(query.limit);
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;

    const buckets: QueueBucket[] = query.bucket
      ? [query.bucket]
      : (['pinned', 'locked', 'hidden_replies'] as QueueBucket[]);

    const all: QueueItemDto[] = [];
    for (const bucket of buckets) {
      const items = await this.queueBucketRows(tenant, bucket);
      all.push(...items);
    }
    // Sort desc by createdAt globally so mixed buckets interleave sensibly.
    all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    let startIdx = 0;
    if (cursor) {
      startIdx = all.findIndex(
        (i) => i.createdAt < cursor.createdAt || (i.createdAt === cursor.createdAt && i.id < cursor.id),
      );
      if (startIdx < 0) startIdx = all.length;
    }
    const slice = all.slice(startIdx, startIdx + limit);
    const next = all[startIdx + limit];
    const nextCursor = next
      ? encodeCursor({ id: next.id, createdAt: next.createdAt })
      : null;

    return { items: slice, nextCursor };
  }

  async counts(tenant: TenantContext): Promise<QueueCountsDto> {
    const pinned = (await tenant.queryRunner.query(
      `SELECT count(*)::int AS n FROM forum_posts WHERE is_pinned = true AND deleted_at IS NULL`,
    )) as Array<{ n: number }>;
    const locked = (await tenant.queryRunner.query(
      `SELECT count(*)::int AS n FROM forum_posts WHERE is_locked = true AND deleted_at IS NULL`,
    )) as Array<{ n: number }>;
    const hiddenReplies = (await tenant.queryRunner.query(
      `SELECT count(*)::int AS n FROM forum_replies WHERE hidden_at IS NOT NULL AND deleted_at IS NULL`,
    )) as Array<{ n: number }>;
    const tagOverrides = (await tenant.queryRunner.query(
      `SELECT count(*)::int AS n FROM forum_moderation_actions WHERE action = 'tag_override'`,
    )) as Array<{ n: number }>;

    const p = pinned[0]?.n ?? 0;
    const l = locked[0]?.n ?? 0;
    const h = hiddenReplies[0]?.n ?? 0;
    const t = tagOverrides[0]?.n ?? 0;
    return {
      all: p + l + h + t,
      hidden_replies: h,
      pinned: p,
      locked: l,
      tag_overrides: t,
    };
  }

  private async queueBucketRows(
    tenant: TenantContext,
    bucket: QueueBucket,
  ): Promise<QueueItemDto[]> {
    switch (bucket) {
      case 'pinned': {
        const rows = (await tenant.queryRunner.query(
          `SELECT id, title, created_at, author_user_id
             FROM forum_posts
            WHERE is_pinned = true AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT 100`,
        )) as Array<{
          id: string;
          title: string;
          created_at: Date;
          author_user_id: string;
        }>;
        return rows.map((r) => ({
          id: r.id,
          bucket,
          targetType: 'post',
          targetId: r.id,
          title: r.title,
          subtitle: `Pinned by moderator`,
          actorUserId: r.author_user_id,
          reason: null,
          createdAt: new Date(r.created_at).toISOString(),
        }));
      }
      case 'locked': {
        const rows = (await tenant.queryRunner.query(
          `SELECT id, title, created_at, author_user_id
             FROM forum_posts
            WHERE is_locked = true AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT 100`,
        )) as Array<{
          id: string;
          title: string;
          created_at: Date;
          author_user_id: string;
        }>;
        return rows.map((r) => ({
          id: r.id,
          bucket,
          targetType: 'post',
          targetId: r.id,
          title: r.title,
          subtitle: 'Locked thread',
          actorUserId: r.author_user_id,
          reason: null,
          createdAt: new Date(r.created_at).toISOString(),
        }));
      }
      case 'hidden_replies': {
        const rows = (await tenant.queryRunner.query(
          `SELECT r.id,
                  r.post_id,
                  r.body,
                  r.hidden_at,
                  r.hidden_by_user_id,
                  r.hide_reason,
                  p.title
             FROM forum_replies r
             JOIN forum_posts p ON p.id = r.post_id
            WHERE r.hidden_at IS NOT NULL
              AND r.deleted_at IS NULL
            ORDER BY r.hidden_at DESC
            LIMIT 100`,
        )) as Array<{
          id: string;
          post_id: string;
          body: string;
          hidden_at: Date;
          hidden_by_user_id: string | null;
          hide_reason: string | null;
          title: string;
        }>;
        return rows.map((r) => ({
          id: r.id,
          bucket,
          targetType: 'reply',
          targetId: r.id,
          title: r.title,
          subtitle: (r.body ?? '').slice(0, 140),
          actorUserId: r.hidden_by_user_id,
          reason: r.hide_reason,
          createdAt: new Date(r.hidden_at).toISOString(),
        }));
      }
      case 'tag_overrides': {
        const rows = (await tenant.queryRunner.query(
          `SELECT ma.id, ma.target_type, ma.target_id, ma.actor_user_id, ma.reason, ma.created_at,
                  COALESCE(p.title, '') AS title
             FROM forum_moderation_actions ma
        LEFT JOIN forum_posts p ON p.id = ma.target_id
            WHERE ma.action = 'tag_override'
            ORDER BY ma.created_at DESC
            LIMIT 100`,
        )) as Array<{
          id: string;
          target_type: 'post' | 'reply';
          target_id: string;
          actor_user_id: string;
          reason: string | null;
          created_at: Date;
          title: string;
        }>;
        return rows.map((r) => ({
          id: r.id,
          bucket,
          targetType: r.target_type,
          targetId: r.target_id,
          title: r.title || 'Tag override',
          subtitle: r.reason ?? '',
          actorUserId: r.actor_user_id,
          reason: r.reason,
          createdAt: new Date(r.created_at).toISOString(),
        }));
      }
      default: {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: `Unknown bucket: ${bucket as string}`,
        });
      }
    }
  }

  private async emit(
    eventType:
      | 'forum.post.pinned'
      | 'forum.post.locked'
      | 'forum.content.hidden'
      | 'forum.content.restored'
      | 'forum.moderation.action',
    tenant: TenantContext,
    user: AuthenticatedUser,
    correlationId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.events
      .publish({
        eventType,
        communityCode: tenant.communityCode,
        actorUserId: user.platformUserId,
        correlationId,
        payload,
      })
      .catch((err) =>
        this.logger.warn(
          `${eventType} publish failed: ${(err as Error).message}`,
        ),
      );
  }
}
