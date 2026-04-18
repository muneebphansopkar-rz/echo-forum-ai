'use client';

import Link from 'next/link';
import { useTags } from '@/hooks/use-tags';
import { cn } from '@/lib/utils';

interface TagPillsProps {
  /** Active tag slug, or undefined for "All". */
  activeSlug?: string;
  /** Base path the chips link to — preserves sort/window. */
  basePath: string;
  /** Extra query params to keep across nav (e.g. ?w=week on /top). */
  preserveQuery?: Record<string, string | undefined>;
}

export function TagPills({
  activeSlug,
  basePath,
  preserveQuery,
}: TagPillsProps): JSX.Element {
  const { data: tags, isLoading } = useTags();

  function hrefFor(tagSlug?: string): string {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(preserveQuery ?? {})) {
      if (v) params.set(k, v);
    }
    if (tagSlug) params.set('tag', tagSlug);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  if (isLoading) {
    return (
      <div className="flex flex-wrap items-center gap-2" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-6 w-16 animate-pulse rounded-full border border-border bg-secondary"
          />
        ))}
      </div>
    );
  }

  const items = tags ?? [];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Pill href={hrefFor(undefined)} active={!activeSlug} label="All posts" />
      {items.map((tag) => (
        <Pill
          key={tag.id}
          href={hrefFor(tag.slug)}
          active={activeSlug === tag.slug}
          label={tag.label}
        />
      ))}
    </div>
  );
}

function Pill({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors',
        active
          ? 'border-primary/40 bg-primary/10 font-semibold text-primary'
          : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
      )}
    >
      {label}
    </Link>
  );
}
