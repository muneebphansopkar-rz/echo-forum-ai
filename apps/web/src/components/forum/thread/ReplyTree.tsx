'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useReplies, type Reply } from '@/hooks/use-posts';
import type { ReplySort } from '@/lib/query-keys';
import { ReplyCard } from './ReplyCard';

interface ReplyTreeProps {
  postId: string;
  opAuthorId?: string;
  locked?: boolean;
}

interface GroupedReply {
  root: Reply;
  children: Reply[];
}

function group(replies: Reply[]): GroupedReply[] {
  const roots = replies.filter((r) => r.parentReplyId === null);
  return roots.map((root) => ({
    root,
    children: replies.filter((r) => r.parentReplyId === root.id),
  }));
}

export function ReplyTree({
  postId,
  opAuthorId,
  locked,
}: ReplyTreeProps): JSX.Element {
  const [sort, setSort] = useState<ReplySort>('top');
  const { data, isLoading, isError, error } = useReplies(postId, sort);

  const items = data?.items ?? [];
  const grouped = group(items);
  const total = items.length;

  return (
    <section aria-labelledby="replies-heading" className="mt-6">
      <div className="mb-3 flex items-center justify-between border-y border-border py-3">
        <h2
          id="replies-heading"
          className="text-sm font-semibold text-foreground"
        >
          {total} {total === 1 ? 'reply' : 'replies'}
        </h2>

        <div
          role="tablist"
          aria-label="Sort replies"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary p-0.5"
        >
          {(['top', 'new'] as const).map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={sort === key}
              type="button"
              onClick={() => setSort(key)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                sort === key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-md border border-border bg-card"
            />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          Couldn&rsquo;t load replies:{' '}
          {error instanceof Error ? error.message : 'unknown error'}
        </div>
      )}

      {!isLoading && !isError && grouped.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
          No replies yet. Be the first to chime in.
        </div>
      )}

      <div>
        {grouped.map(({ root, children }) => (
          <ReplyCard
            key={root.id}
            reply={root}
            postId={postId}
            opAuthorId={opAuthorId}
            locked={locked}
            depth={1}
            childReplies={children}
          />
        ))}
      </div>
    </section>
  );
}
