/**
 * Shape matches `statsResponseSchema` in apps/web/src/lib/zod/stats.ts.
 */
export interface TopContributorDto {
  platformUserId: string;
  displayName: string;
  initials: string;
  upvotesToday: number;
}

export interface CommunityTotalsDto {
  posts: number;
  replies: number;
  upvotes: number;
  members: number;
}

export interface StatsResponse {
  totals: CommunityTotalsDto;
  topContributors: TopContributorDto[];
}
