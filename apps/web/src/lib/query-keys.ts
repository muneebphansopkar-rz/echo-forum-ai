/**
 * Central query-key factory. Components and hooks must import from here —
 * never build keys inline. This keeps invalidation precise.
 */
export type FeedKind = 'hot' | 'new' | 'top';
export type TopWindow = 'today' | 'week' | 'all';
export type ReplySort = 'top' | 'new';

export type ModQueueBucket =
  | 'all'
  | 'hidden_replies'
  | 'pinned'
  | 'locked'
  | 'tag_overrides';

export interface FeedParams {
  sort: FeedKind;
  window?: TopWindow;
  tag?: string;
  cursor?: string;
}

export interface SearchParams {
  q: string;
  tag?: string;
  cursor?: string;
}

export const qk = {
  me: () => ['me'] as const,
  posts: {
    feed: (
      feed: FeedKind,
      tag?: string,
      cursor?: string,
      window?: TopWindow,
    ) => ['posts', feed, { tag, cursor, window }] as const,
    detail: (id: string) => ['posts', id] as const,
    replies: (postId: string, sort?: ReplySort) =>
      ['posts', postId, 'replies', { sort }] as const,
  },
  tags: {
    list: () => ['tags'] as const,
  },
  stats: {
    community: () => ['stats', 'community'] as const,
  },
  search: (q: string, tag?: string) => ['search', { q, tag }] as const,
  moderation: {
    queue: (bucket: ModQueueBucket, cursor?: string) =>
      ['moderation', 'queue', bucket, { cursor }] as const,
    counts: () => ['moderation', 'counts'] as const,
  },
} as const;
