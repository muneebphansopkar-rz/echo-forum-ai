'use client';

import { useState } from 'react';
import { SearchInput } from '@/components/forum/search/SearchInput';
import { SearchFilters } from '@/components/forum/search/SearchFilters';
import { SearchResultCard } from '@/components/forum/search/SearchResultCard';
import { useSearch } from '@/hooks/use-search';

export default function SearchPage(): JSX.Element {
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<string | undefined>(undefined);

  const { data, isLoading, isError, error, isFetching } = useSearch({ q, tag });

  const results = data?.items ?? [];
  const ready = q.trim().length >= 2;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-6 py-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Search</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Find posts by title and body. Results stay inside the current
            community.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          Community only
        </span>
      </header>

      <SearchInput initialValue={q} onSubmit={setQ} />

      <SearchFilters activeSlug={tag} onChange={setTag} />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {ready ? (
          <span>
            {isFetching ? 'Searching…' : `${results.length} result${results.length === 1 ? '' : 's'}`}
            {q ? (
              <>
                {' '}for <strong className="text-foreground">&ldquo;{q}&rdquo;</strong>
              </>
            ) : null}
          </span>
        ) : (
          <span>Type at least 2 characters to search.</span>
        )}
      </div>

      {isLoading && ready && (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-border bg-card"
            />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Search failed:{' '}
          {error instanceof Error ? error.message : 'unknown error'}
        </div>
      )}

      {ready && !isLoading && !isError && results.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No posts match the current query and tag filter.
        </div>
      )}

      {results.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          {results.map((result) => (
            <SearchResultCard key={result.id} result={result} />
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Full-text search via Postgres tsvector + GIN. Scoped per community — no
        cross-community leakage.
      </p>
    </div>
  );
}
