import {
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import { EventsService } from '../../events/events.service';
import type { TenantContext } from '../../tenancy/tenant-query';
import { checkLimits, reportUsage } from '../common/limits';
import type { CreateTagDto } from './dto/create-tag.dto';
import type { TagResponse } from './dto/tag.response';
import { TagsRepository, tagRowToDto } from './tags.repository';

@Injectable()
export class TagsService {
  private readonly logger = new Logger(TagsService.name);

  constructor(
    private readonly repo: TagsRepository,
    private readonly events: EventsService,
  ) {}

  async list(tenant: TenantContext): Promise<TagResponse[]> {
    const rows = await this.repo.listAll(tenant);
    return rows.map(tagRowToDto);
  }

  async create(
    user: AuthenticatedUser,
    tenant: TenantContext,
    input: CreateTagDto,
    correlationId: string,
  ): Promise<TagResponse> {
    await checkLimits({ user, action: 'forum.tag.create' });

    const existing = await this.repo.findBySlug(tenant, input.slug);
    if (existing) {
      throw new ConflictException({
        code: 'TAG_CONFLICT',
        message: `Tag slug '${input.slug}' already exists`,
      });
    }

    const row = await this.repo.create(tenant, input);
    await reportUsage({ user, action: 'forum.tag.create' });

    // Publish after the implicit commit (single INSERT is its own tx).
    await this.events
      .publish({
        eventType: 'forum.tag.created',
        communityCode: tenant.communityCode,
        actorUserId: user.platformUserId,
        correlationId,
        payload: { tagId: row.id, slug: row.slug, label: row.label },
      })
      .catch((err) =>
        this.logger.warn(
          `forum.tag.created publish failed: ${(err as Error).message}`,
        ),
      );

    return tagRowToDto(row);
  }
}
