import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import { EventsService } from '../../events/events.service';
import type { TenantContext } from '../../tenancy/tenant-query';
import { checkLimits, reportUsage } from '../common/limits';
import { beginWithSearchPath } from '../common/with-tx';
import type { ToggleVoteDto, ToggleVoteResult } from './dto/toggle-vote.dto';
import { VotesRepository } from './votes.repository';

@Injectable()
export class VotesService {
  private readonly logger = new Logger(VotesService.name);

  constructor(
    private readonly votes: VotesRepository,
    private readonly events: EventsService,
  ) {}

  async toggle(
    user: AuthenticatedUser,
    tenant: TenantContext,
    dto: ToggleVoteDto,
    correlationId: string,
  ): Promise<ToggleVoteResult> {
    await checkLimits({ user, action: 'forum.vote.toggle' });

    const exists = await this.votes.exists(tenant, dto.targetType, dto.targetId);
    if (!exists) {
      throw new NotFoundException({
        code:
          dto.targetType === 'post'
            ? 'FORUM_POST_NOT_FOUND'
            : 'FORUM_REPLY_NOT_FOUND',
        message: `${dto.targetType === 'post' ? 'Post' : 'Reply'} not found`,
      });
    }

    const runner = tenant.queryRunner;
    await beginWithSearchPath(tenant);
    let upvoted: boolean;
    let newCount: number;
    try {
      const had = await this.votes.hasVote(
        tenant,
        user.platformUserId,
        dto.targetType,
        dto.targetId,
      );

      if (had) {
        await this.votes.remove(
          tenant,
          user.platformUserId,
          dto.targetType,
          dto.targetId,
        );
        const c = await this.votes.adjustTargetCount(
          tenant,
          dto.targetType,
          dto.targetId,
          -1,
        );
        upvoted = false;
        newCount = c ?? 0;
      } else {
        await this.votes.insert(
          tenant,
          user.platformUserId,
          dto.targetType,
          dto.targetId,
        );
        const c = await this.votes.adjustTargetCount(
          tenant,
          dto.targetType,
          dto.targetId,
          1,
        );
        upvoted = true;
        newCount = c ?? 0;
      }
      await runner.query('COMMIT');
    } catch (err) {
      await runner.query('ROLLBACK').catch(() => undefined);
      throw err;
    }

    await reportUsage({ user, action: 'forum.vote.toggle' });

    // Per CONTEXT.md: emit `forum.post.upvoted` only on the insert (toggle-on).
    if (upvoted) {
      const eventType =
        dto.targetType === 'post' ? 'forum.post.upvoted' : 'forum.reply.upvoted';
      await this.events
        .publish({
          eventType,
          communityCode: tenant.communityCode,
          actorUserId: user.platformUserId,
          correlationId,
          payload: {
            targetType: dto.targetType,
            targetId: dto.targetId,
            voterId: user.platformUserId,
          },
        })
        .catch((err) =>
          this.logger.warn(
            `${eventType} publish failed: ${(err as Error).message}`,
          ),
        );
    }

    return { upvoted, upvoteCount: newCount };
  }
}
