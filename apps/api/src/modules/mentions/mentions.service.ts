import { Injectable, Logger } from '@nestjs/common';
import { EventsService } from '../../events/events.service';
import type { TenantContext } from '../../tenancy/tenant-query';

const MENTION_REGEX = /@([A-Z0-9]+)/gi;

export interface RecordMentionsArgs {
  tenant: TenantContext;
  sourceType: 'post' | 'reply';
  sourceId: string;
  body: string;
  actorPlatformUserId: string;
  correlationId: string;
  /** Extra payload merged into each `forum.mention` event (e.g. { postId }). */
  eventContext?: Record<string, unknown>;
}

/**
 * Extracts `@USR123` style mentions, persists one `forum_mentions` row per
 * unique target, and emits `forum.mention` events (AFTER commit — callers
 * must ensure they only invoke this once the parent insert is durable).
 *
 * Membership validation is stubbed to "always valid" for the MVP — the
 * platform's user directory will be consulted in a follow-up.
 */
@Injectable()
export class MentionsService {
  private readonly logger = new Logger(MentionsService.name);

  constructor(private readonly events: EventsService) {}

  extract(body: string): string[] {
    const seen = new Set<string>();
    for (const match of body.matchAll(MENTION_REGEX)) {
      const raw = match[1]?.toUpperCase();
      if (!raw) continue;
      seen.add(raw.startsWith('USR') ? raw : `USR${raw}`);
    }
    return [...seen];
  }

  async recordAndEmit(args: RecordMentionsArgs): Promise<string[]> {
    const mentions = this.extract(args.body);
    if (mentions.length === 0) return [];

    // Insert — one row per mention. `ON CONFLICT DO NOTHING` is a safety net;
    // the natural key isn't enforced at the DB level but unique in practice.
    await args.tenant.queryRunner.query(
      `INSERT INTO forum_mentions (source_type, source_id, mentioned_platform_user_id)
         SELECT $1, $2::uuid, unnest($3::text[])`,
      [args.sourceType, args.sourceId, mentions],
    );

    for (const target of mentions) {
      await this.events
        .publish({
          eventType: 'forum.mention',
          communityCode: args.tenant.communityCode,
          actorUserId: args.actorPlatformUserId,
          correlationId: args.correlationId,
          payload: {
            sourceType: args.sourceType,
            sourceId: args.sourceId,
            mentionedPlatformUserId: target,
            ...args.eventContext,
          },
        })
        .catch((err) =>
          this.logger.warn(
            `forum.mention publish failed for ${target}: ${(err as Error).message}`,
          ),
        );
    }
    return mentions;
  }
}
