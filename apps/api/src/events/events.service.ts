import { randomUUID } from 'node:crypto';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../config/app-config.service';

/**
 * Domain event publisher.
 *
 * Channel: `skep:events:<community_code>`.
 * Envelope (from project/SKEP-INTEGRATION.md):
 *   { eventId, eventType, communityCode, actorUserId, occurredAt, payload, correlationId }
 *
 * Rule: publish AFTER the DB transaction commits — callers only invoke this
 * from a post-commit hook. If Redis is unavailable the call no-ops (logged
 * once on first failure); this keeps the hot path resilient during local dev.
 */
export type ForumEventType =
  | 'forum.post.created'
  | 'forum.post.updated'
  | 'forum.post.deleted'
  | 'forum.post.upvoted'
  | 'forum.post.pinned'
  | 'forum.post.locked'
  | 'forum.reply.created'
  | 'forum.reply.deleted'
  | 'forum.reply.upvoted'
  | 'forum.content.hidden'
  | 'forum.content.restored'
  | 'forum.moderation.action'
  | 'forum.mention'
  | 'forum.tag.created';

export interface ForumEventEnvelope<TPayload> {
  eventId: string;
  eventType: ForumEventType;
  communityCode: string;
  actorUserId: string | null;
  occurredAt: string;
  correlationId: string;
  payload: TPayload;
}

export interface PublishArgs<TPayload extends object> {
  eventType: ForumEventType;
  communityCode: string;
  actorUserId: string | null;
  correlationId: string;
  payload: TPayload;
}

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private client?: Redis;
  private hasLoggedConnectError = false;

  constructor(private readonly config: AppConfigService) {}

  onModuleInit(): void {
    this.client = new Redis(this.config.redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 500, 5_000),
    });
    this.client.on('error', (err) => {
      if (!this.hasLoggedConnectError) {
        this.logger.warn(
          `Redis unavailable (${err.message}). Events will no-op until it comes back.`,
        );
        this.hasLoggedConnectError = true;
      }
    });
    this.client.on('ready', () => {
      this.logger.log('Redis connected');
      this.hasLoggedConnectError = false;
    });
    this.client.connect().catch(() => {
      /* first-connect failures surface via the 'error' listener */
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit();
  }

  async publish<TPayload extends object>(args: PublishArgs<TPayload>): Promise<void> {
    const envelope: ForumEventEnvelope<TPayload> = {
      eventId: randomUUID(),
      eventType: args.eventType,
      communityCode: args.communityCode,
      actorUserId: args.actorUserId,
      occurredAt: new Date().toISOString(),
      correlationId: args.correlationId,
      payload: args.payload,
    };

    if (!this.client || this.client.status !== 'ready') {
      this.logger.debug(
        `Publish ${args.eventType} skipped — Redis not ready (community=${args.communityCode})`,
      );
      return;
    }

    const channel = `skep:events:${args.communityCode}`;
    await this.client.publish(channel, JSON.stringify(envelope));
  }
}
