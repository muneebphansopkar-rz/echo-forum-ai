'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from './use-api-client';
import { qk, type FeedKind, type TopWindow, type ReplySort } from '@/lib/query-keys';
import type { PostSummary, PostDetail, Reply, Tag } from '@/lib/zod/common';
import type { CreatePostInput } from '@/lib/zod/post';

export type { PostSummary, PostDetail, Reply, Tag } from '@/lib/zod/common';

// ── Tags ──────────────────────────────────────────────────────────────────
/** All available tags for the current community — used by composer + filters. */
export function useTags() {
  const api = useApiClient();
  return useQuery({
    queryKey: qk.tags.list(),
    queryFn: () => api.get<Tag[]>('/forum/tags'),
    staleTime: 5 * 60_000,
  });
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface UseFeedArgs {
  sort: FeedKind;
  window?: TopWindow;
  tag?: string;
}

/** Hot / New / Top feed query. */
export function useFeed(args: UseFeedArgs) {
  const api = useApiClient();
  const { sort, window, tag } = args;
  return useQuery({
    queryKey: qk.posts.feed(sort, tag, undefined, window),
    queryFn: async () => {
      const params = new URLSearchParams({ sort });
      if (sort === 'top' && window) params.set('window', window);
      if (tag) params.set('tag', tag);
      return api.get<Paginated<PostSummary>>(`/forum/posts?${params.toString()}`);
    },
  });
}

export function usePost(postId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: qk.posts.detail(postId),
    queryFn: () => api.get<PostDetail>(`/forum/posts/${postId}`),
    enabled: Boolean(postId),
  });
}

export function useReplies(postId: string, sort: ReplySort = 'top') {
  const api = useApiClient();
  return useQuery({
    queryKey: qk.posts.replies(postId, sort),
    queryFn: () =>
      api.get<Paginated<Reply>>(
        `/forum/posts/${postId}/replies?sort=${sort}`,
      ),
    enabled: Boolean(postId),
  });
}

// ── Vote toggle with optimistic update ────────────────────────────────────
export interface ToggleVoteArgs {
  targetType: 'post' | 'reply';
  targetId: string;
  /** For reply votes, we need the post id so we can reach the cached list. */
  postId?: string;
  /** For post votes, passing this lets us optimistically update the feed too. */
  feedKeys?: ReadonlyArray<readonly unknown[]>;
}

interface VoteResponse {
  upvoted: boolean;
  upvoteCount: number;
}

type PrevSnapshot = Array<[readonly unknown[], unknown]>;

function applyDelta(upvoted: boolean, count: number, toggle: boolean) {
  // Flip then adjust count.
  const nextUp = toggle ? !upvoted : upvoted;
  const nextCount = toggle
    ? upvoted
      ? Math.max(0, count - 1)
      : count + 1
    : count;
  return { nextUp, nextCount };
}

export function useToggleVote() {
  const api = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: ToggleVoteArgs) =>
      api.post<VoteResponse>('/forum/votes', {
        targetType: args.targetType,
        targetId: args.targetId,
      }),
    onMutate: async (args) => {
      const snapshots: PrevSnapshot = [];

      if (args.targetType === 'post') {
        // Flip post detail cache.
        const detailKey = qk.posts.detail(args.targetId);
        await qc.cancelQueries({ queryKey: detailKey });
        const prevDetail = qc.getQueryData<PostDetail>(detailKey);
        snapshots.push([detailKey, prevDetail]);
        if (prevDetail) {
          const { nextUp, nextCount } = applyDelta(
            prevDetail.isViewerUpvoted,
            prevDetail.upvoteCount,
            true,
          );
          qc.setQueryData<PostDetail>(detailKey, {
            ...prevDetail,
            isViewerUpvoted: nextUp,
            upvoteCount: nextCount,
          });
        }

        // Flip every feed cache that currently holds this post.
        const allFeeds = qc.getQueriesData<Paginated<PostSummary>>({
          queryKey: ['posts'],
        });
        for (const [key, data] of allFeeds) {
          if (!data?.items) continue;
          const hit = data.items.find((p) => p.id === args.targetId);
          if (!hit) continue;
          snapshots.push([key, data]);
          qc.setQueryData<Paginated<PostSummary>>(key, {
            ...data,
            items: data.items.map((p) =>
              p.id === args.targetId
                ? {
                    ...p,
                    isViewerUpvoted: !p.isViewerUpvoted,
                    upvoteCount: p.isViewerUpvoted
                      ? Math.max(0, p.upvoteCount - 1)
                      : p.upvoteCount + 1,
                  }
                : p,
            ),
          });
        }
      } else if (args.targetType === 'reply' && args.postId) {
        // Flip every reply list cache for this post. Match on the array
        // prefix only — `qk.posts.replies(postId)` includes a trailing
        // `{ sort: undefined }` object that doesn't structurally match
        // the live `{ sort: 'top' | 'new' }` cached queries.
        const repliesPrefix = ['posts', args.postId, 'replies'] as const;
        await qc.cancelQueries({ queryKey: repliesPrefix });
        const lists = qc.getQueriesData<Paginated<Reply>>({
          queryKey: repliesPrefix,
        });
        for (const [key, data] of lists) {
          if (!data?.items) continue;
          snapshots.push([key, data]);
          qc.setQueryData<Paginated<Reply>>(key, {
            ...data,
            items: data.items.map((r) =>
              r.id === args.targetId
                ? {
                    ...r,
                    isViewerUpvoted: !r.isViewerUpvoted,
                    upvoteCount: r.isViewerUpvoted
                      ? Math.max(0, r.upvoteCount - 1)
                      : r.upvoteCount + 1,
                  }
                : r,
            ),
          });
        }
      }

      return { snapshots };
    },
    onError: (_err, _args, ctx) => {
      // Roll back every snapshot we took.
      if (!ctx) return;
      for (const [key, data] of ctx.snapshots) {
        qc.setQueryData(key, data);
      }
    },
    onSettled: (_data, _err, args) => {
      if (args.targetType === 'post') {
        qc.invalidateQueries({ queryKey: qk.posts.detail(args.targetId) });
      } else if (args.targetType === 'reply' && args.postId) {
        qc.invalidateQueries({
          queryKey: ['posts', args.postId, 'replies'] as const,
        });
      }
    },
  });
}

// ── Create reply ──────────────────────────────────────────────────────────
export interface CreateReplyArgs {
  postId: string;
  body: string;
  parentReplyId?: string | null;
}

// ── Create post ───────────────────────────────────────────────────────────
/**
 * Publishes a new post and primes the detail cache so the /p/:id redirect
 * renders instantly without a second round-trip.
 */
export function useCreatePost() {
  const api = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePostInput) =>
      api.post<PostDetail>('/forum/posts', input),
    onSuccess: (created) => {
      qc.setQueryData(qk.posts.detail(created.id), created);
      // Any feed cache might now be stale — let them refetch when observed.
      qc.invalidateQueries({ queryKey: ['posts'], exact: false });
    },
  });
}

export function useCreateReply() {
  const api = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, body, parentReplyId }: CreateReplyArgs) =>
      api.post<Reply>(`/forum/posts/${postId}/replies`, {
        body,
        parentReplyId: parentReplyId ?? null,
      }),
    onSuccess: (_reply, args) => {
      qc.invalidateQueries({ queryKey: qk.posts.replies(args.postId) });
      qc.invalidateQueries({ queryKey: qk.posts.detail(args.postId) });
    },
  });
}
