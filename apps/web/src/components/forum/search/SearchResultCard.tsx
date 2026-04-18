'use client';

import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import { InlineHighlight } from '../thread/Markdown';
import type { SearchResult } from '@/hooks/use-search';

interface SearchResultCardProps {
  result: SearchResult;
}

export function SearchResultCard({ result }: SearchResultCardProps): JSX.Element {
  const primaryTag = result.tags[0];

  return (
    <Link
      href={`/p/${result.id}`}
      className="block border-b border-border/70 p-4 transition-colors last:border-b-0 hover:bg-secondary/60"
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {primaryTag && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {primaryTag.label}
          </span>
        )}
        <span>{result.authorDisplayName}</span>
        <span aria-hidden>·</span>
        <span>
          {formatDistanceToNowStrict(new Date(result.createdAt), {
            addSuffix: true,
          })}
        </span>
        <span aria-hidden>·</span>
        <span>{result.replyCount} replies</span>
      </div>
      <h3 className="mb-1 text-sm font-semibold leading-snug text-foreground">
        {result.highlights.title ? (
          <InlineHighlight html={result.highlights.title} />
        ) : (
          result.title
        )}
      </h3>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {result.highlights.body ? (
          <InlineHighlight html={result.highlights.body} />
        ) : (
          result.excerpt
        )}
      </p>
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="tabular-nums">▲ {result.upvoteCount} upvotes</span>
        <span aria-hidden>·</span>
        <span>{result.replyCount} replies</span>
      </div>
    </Link>
  );
}
