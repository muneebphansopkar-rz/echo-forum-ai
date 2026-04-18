'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from './use-api-client';
import { qk, type ModQueueBucket } from '@/lib/query-keys';
import type { QueueItem } from '@/lib/zod/common';
import type { QueueCounts } from '@/lib/zod/moderation';

/**
 * Moderation queue + action hooks.
 *
 * Invalidation strategy:
 *   - Every action invalidates `['moderation']` so the queue list refreshes.
 *   - Pin/lock/hide also invalidate the affected post detail and the feed
 *     list root so the forum UI picks up new state without refetching every
 *     page.
 */

export interface ModQueueResponse {
  items: QueueItem[];
  nextCursor: string | null;
  counts: QueueCounts;
}

export function useModQueue(bucket: ModQueueBucket, cursor?: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: qk.moderation.queue(bucket, cursor),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (bucket !== 'all') params.set('bucket', bucket);
      if (cursor) params.set('cursor', cursor);
      const qs = params.toString();
      const path = qs ? `/forum/moderation/queue?${qs}` : '/forum/moderation/queue';
      return api.get<ModQueueResponse>(path);
    },
  });
}

/**
 * Queue totals per bucket. Backed by `GET /forum/moderation/counts` —
 * a separate endpoint from the queue list, so the sidebar badge and the
 * summary cards stay accurate even when a bucket filter is active.
 */
export function useModerationCounts() {
  const api = useApiClient();
  return useQuery({
    queryKey: qk.moderation.counts(),
    queryFn: () => api.get<QueueCounts>('/forum/moderation/counts'),
    staleTime: 15_000,
  });
}

// ── Actions ───────────────────────────────────────────────────────────────

export type ModActionInput =
  | { kind: 'pin'; postId: string; pinned: boolean }
  | { kind: 'lock'; postId: string; locked: boolean }
  | {
      kind: 'hide';
      targetType: 'post' | 'reply';
      targetId: string;
      reason?: string;
      /** For reply hides we also invalidate the parent post detail + replies. */
      postId?: string;
    }
  | {
      kind: 'restore';
      targetType: 'post' | 'reply';
      targetId: string;
      postId?: string;
    }
  | {
      kind: 'retag';
      postId: string;
      tagIds: string[];
      /** Previous tag ids — persisted into the audit log metadata. */
      previousTagIds?: string[];
    };

const PLURAL_PATH: Record<'post' | 'reply', 'posts' | 'replies'> = {
  post: 'posts',
  reply: 'replies',
};

/**
 * Single mutation wrapper covering all moderation actions. Callers pass
 * `{ kind, ... }` and we dispatch to the correct endpoint so every action
 * shares the same invalidation rules.
 */
export function useModerationAction() {
  const api = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: ModActionInput): Promise<void> => {
      switch (input.kind) {
        case 'pin':
          await api.post(`/forum/moderation/posts/${input.postId}/pin`, {
            pinned: input.pinned,
          });
          return;
        case 'lock':
          await api.post(`/forum/moderation/posts/${input.postId}/lock`, {
            locked: input.locked,
          });
          return;
        case 'hide':
          await api.post(
            `/forum/moderation/${PLURAL_PATH[input.targetType]}/${input.targetId}/hide`,
            input.reason ? { reason: input.reason } : {},
          );
          return;
        case 'restore':
          await api.del(
            `/forum/moderation/${PLURAL_PATH[input.targetType]}/${input.targetId}/hide`,
          );
          return;
        case 'retag':
          await api.post(`/forum/moderation/posts/${input.postId}/retag`, {
            tagIds: input.tagIds,
            previousTagIds: input.previousTagIds,
          });
          return;
      }
    },
    onSuccess: (_data, input) => {
      // Always refresh the moderation queue + counts.
      qc.invalidateQueries({ queryKey: ['moderation'], exact: false });

      // Precise invalidation of affected forum caches.
      switch (input.kind) {
        case 'pin':
        case 'lock':
        case 'retag':
          qc.invalidateQueries({ queryKey: qk.posts.detail(input.postId) });
          qc.invalidateQueries({ queryKey: ['posts'], exact: false });
          qc.invalidateQueries({ queryKey: qk.tags.list() });
          return;
        case 'hide':
        case 'restore': {
          if (input.targetType === 'post') {
            qc.invalidateQueries({
              queryKey: qk.posts.detail(input.targetId),
            });
            qc.invalidateQueries({ queryKey: ['posts'], exact: false });
          } else {
            // Reply hide/restore — prefix-match all reply lists for the post.
            if (input.postId) {
              qc.invalidateQueries({
                queryKey: ['posts', input.postId, 'replies'] as const,
              });
              qc.invalidateQueries({
                queryKey: qk.posts.detail(input.postId),
              });
            } else {
              // No postId known (e.g. from queue); fall back to a broad flush.
              qc.invalidateQueries({ queryKey: ['posts'], exact: false });
            }
          }
          return;
        }
      }
    },
  });
}
