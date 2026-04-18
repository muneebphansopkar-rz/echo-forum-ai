'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from './use-api-client';
import { qk } from '@/lib/query-keys';
import type { StatsResponse } from '@/lib/zod/stats';

/**
 * Community-wide stats — totals (posts / replies / upvotes / members) and
 * top contributors by upvotes today. Feeds the ForumRightPanel.
 */
export function useCommunityStats() {
  const api = useApiClient();
  return useQuery({
    queryKey: qk.stats.community(),
    queryFn: () => api.get<StatsResponse>('/forum/stats'),
    staleTime: 60_000,
  });
}

export type { StatsResponse, CommunityTotals, TopContributor } from '@/lib/zod/stats';
