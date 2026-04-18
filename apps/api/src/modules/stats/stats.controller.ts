import { Controller, Get } from '@nestjs/common';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../auth/roles.decorator';
import type { TenantContext } from '../../tenancy/tenant-query';
import type { StatsResponse } from './dto/stats.response';
import { StatsService } from './stats.service';

/**
 * Community-wide stats surface.
 *   GET /forum/stats → totals + top contributors (today)
 *
 * Intentionally cached minimally for the hackathon — scale via a Redis
 * cache or materialized view when p95 > 150 ms.
 */
@Controller('forum/stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Roles('MEMBER')
  @Get()
  async get(@Tenant() tenant: TenantContext): Promise<StatsResponse> {
    return this.stats.forCommunity(tenant);
  }
}
