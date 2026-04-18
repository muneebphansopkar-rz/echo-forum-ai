'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from './use-api-client';
import { qk } from '@/lib/query-keys';
import type { SearchResult } from '@/lib/zod/search';
import type { Paginated } from './use-posts';

export type { SearchResult } from '@/lib/zod/search';

export interface UseSearchArgs {
  q: string;
  tag?: string;
}

export function useSearch({ q, tag }: UseSearchArgs) {
  const api = useApiClient();
  const trimmed = q.trim();
  return useQuery({
    queryKey: qk.search(trimmed, tag),
    queryFn: async () => {
      const params = new URLSearchParams({ q: trimmed });
      if (tag) params.set('tag', tag);
      return api.get<Paginated<SearchResult>>(
        `/forum/search?${params.toString()}`,
      );
    },
    enabled: trimmed.length >= 2,
    // Search is somewhat expensive; don't refetch on every focus.
    staleTime: 30_000,
  });
}
