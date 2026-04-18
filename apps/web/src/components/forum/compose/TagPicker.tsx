'use client';

import { cn } from '@/lib/utils';
import { useTags } from '@/hooks/use-posts';
import type { Tag } from '@/lib/zod/common';

interface TagPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  error?: string;
}

/**
 * Pill-style tag selector. Enforces the 1–3 limit from createPostSchema
 * by surfacing an inline error but still lets the form validator have
 * the final say.
 */
export function TagPicker({
  value,
  onChange,
  max = 3,
  error,
}: TagPickerProps): JSX.Element {
  const { data: tags, isLoading, isError } = useTags();

  const toggle = (tagId: string) => {
    if (value.includes(tagId)) {
      onChange(value.filter((t) => t !== tagId));
      return;
    }
    if (value.length >= max) return;
    onChange([...value, tagId]);
  };

  if (isLoading) {
    return (
      <div
        className="flex flex-wrap gap-2.5"
        aria-busy
        aria-label="Loading tags"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-24 animate-pulse rounded-full bg-page-bg"
          />
        ))}
      </div>
    );
  }

  if (isError || !tags) {
    return (
      <div className="rounded-md border border-status-locked/40 bg-status-locked-bg px-3 py-2 text-xs text-status-locked">
        Couldn&rsquo;t load tags. Refresh the page to try again.
      </div>
    );
  }

  const selectedTags: Tag[] = tags.filter((t) => value.includes(t.id));

  return (
    <div>
      <div className="flex flex-wrap gap-2.5">
        {tags.map((tag) => {
          const selected = value.includes(tag.id);
          const atLimit = !selected && value.length >= max;
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              disabled={atLimit}
              aria-pressed={selected}
              className={cn(
                'rounded-full border px-4 py-2 text-[13px] transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-50',
                selected
                  ? 'border-brand-blue-mid bg-brand-blue-light font-medium text-brand-blue'
                  : 'border-border-strong bg-page-bg text-text-secondary hover:border-brand-blue-mid hover:text-brand-blue',
              )}
            >
              {tag.label}
            </button>
          );
        })}
      </div>
      {selectedTags.length > 0 ? (
        <div className="mt-3 text-[13px] text-text-secondary">
          Selected tags:{' '}
          <span className="font-medium text-text-primary">
            {selectedTags.map((t) => t.label).join(', ')}
          </span>
        </div>
      ) : null}
      {error ? (
        <div className="mt-2.5 text-[12.5px] leading-[1.5] text-status-locked">
          {error}
        </div>
      ) : null}
    </div>
  );
}
