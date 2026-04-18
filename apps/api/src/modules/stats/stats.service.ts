import { Injectable } from '@nestjs/common';
import type { TenantContext } from '../../tenancy/tenant-query';
import { StatsRepository } from './stats.repository';
import type {
  StatsResponse,
  TopContributorDto,
} from './dto/stats.response';

@Injectable()
export class StatsService {
  constructor(private readonly repo: StatsRepository) {}

  async forCommunity(tenant: TenantContext): Promise<StatsResponse> {
    const [totals, contributors] = await Promise.all([
      this.repo.totals(tenant),
      this.repo.topContributors(tenant, 3),
    ]);

    return {
      totals,
      topContributors: contributors.map(toContributorDto),
    };
  }
}

function toContributorDto(row: {
  author_user_id: string;
  upvotes_today: number;
}): TopContributorDto {
  const id = row.author_user_id;
  const displayName = id.replace(/^USR/i, 'User ');
  return {
    platformUserId: id,
    displayName,
    initials: makeInitials(displayName),
    upvotesToday: row.upvotes_today,
  };
}

function makeInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '?';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase();
}
