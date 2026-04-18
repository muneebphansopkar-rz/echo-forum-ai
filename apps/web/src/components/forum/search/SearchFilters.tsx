'use client';

import { useTags } from '@/hooks/use-tags';
import { cn } from '@/lib/utils';

interface SearchFiltersProps {
  activeSlug?: string;
  onChange: (slug: string | undefined) => void;
}

export function SearchFilters({
  activeSlug,
  onChange,
}: SearchFiltersProps): JSX.Element {
  const { data: tags, isLoading } = useTags();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Filter by tag:</span>
      <Pill
        active={!activeSlug}
        label="All"
        onClick={() => onChange(undefined)}
      />
      {isLoading &&
        Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-6 w-16 animate-pulse rounded-full border border-border bg-secondary"
          />
        ))}
      {tags?.map((tag) => (
        <Pill
          key={tag.id}
          active={activeSlug === tag.slug}
          label={tag.label}
          onClick={() => onChange(tag.slug)}
        />
      ))}
    </div>
  );
}

function Pill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors',
        active
          ? 'border-primary/40 bg-primary/10 font-semibold text-primary'
          : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}
