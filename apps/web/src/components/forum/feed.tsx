'use client';

import { useFeed, type PostSummary } from '@/hooks/use-posts';
import { PostCard } from './post-card';
import { SortTabs } from './feed/SortTabs';
import { PeriodTabs } from './feed/PeriodTabs';
import { TagPills } from './feed/TagPills';
import type { FeedKind, TopWindow } from '@/lib/query-keys';

interface FeedProps {
  /** @deprecated use `sort`. Kept for any caller still passing the old prop name. */
  kind?: FeedKind;
  sort?: FeedKind;
  window?: TopWindow;
  tag?: string;
}

export function Feed({ kind, sort, window, tag }: FeedProps): JSX.Element {
  const resolvedSort: FeedKind = sort ?? kind ?? 'hot';
  const resolvedWindow: TopWindow | undefined =
    resolvedSort === 'top' ? window ?? 'today' : undefined;

  const { data, isLoading, isError, error } = useFeed({
    sort: resolvedSort,
    window: resolvedWindow,
    tag,
  });

  const basePath =
    resolvedSort === 'top' ? '/top' : resolvedSort === 'new' ? '/new' : '/';

  const preserveQuery: Record<string, string | undefined> = {};
  if (resolvedSort === 'top' && resolvedWindow && resolvedWindow !== 'today') {
    preserveQuery.w = resolvedWindow;
  }

  return (
    <div className="mx-auto w-full max-w-[820px] px-6 py-5 space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <SortTabs active={resolvedSort} />
          {resolvedSort === 'top' && (
            <PeriodTabs active={resolvedWindow ?? 'today'} />
          )}
        </div>

        <TagPills
          activeSlug={tag}
          basePath={basePath}
          preserveQuery={preserveQuery}
        />
      </div>

      <FeedList
        isLoading={isLoading}
        isError={isError}
        error={error}
        items={data?.items ?? []}
      />
    </div>
  );
}

interface FeedListProps {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  items: PostSummary[];
}

function FeedList({ isLoading, isError, error, items }: FeedListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-lg border border-border bg-card"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Couldn&rsquo;t load the feed: {message}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No posts here yet. Be the first to start a conversation.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      <div className="py-5 text-center text-xs text-muted-foreground">
        You&rsquo;re all caught up.
      </div>
    </div>
  );
}
