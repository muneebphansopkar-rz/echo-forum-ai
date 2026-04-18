'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from './use-api-client';
import { qk } from '@/lib/query-keys';
import type { Tag } from '@/lib/zod/common';

export type { Tag } from '@/lib/zod/common';

export function useTags() {
  const api = useApiClient();
  return useQuery({
    queryKey: qk.tags.list(),
    queryFn: () => api.get<Tag[]>('/forum/tags'),
    staleTime: 5 * 60_000,
  });
}
