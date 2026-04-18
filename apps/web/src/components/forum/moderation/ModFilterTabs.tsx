'use client';

import { cn } from '@/lib/utils';
import type { ModQueueBucket } from '@/lib/query-keys';

const TABS: Array<{ id: ModQueueBucket; label: string }> = [
  { id: 'all', label: 'All items' },
  { id: 'hidden_replies', label: 'Hidden replies' },
  { id: 'pinned', label: 'Pinned posts' },
  { id: 'locked', label: 'Locked threads' },
  { id: 'tag_overrides', label: 'Tag overrides' },
];

export function ModFilterTabs({
  active,
  onChange,
  className,
}: {
  active: ModQueueBucket;
  onChange: (next: ModQueueBucket) => void;
  className?: string;
}): JSX.Element {
  return (
    <div
      role="tablist"
      aria-label="Moderation filter"
      className={cn('mb-5 flex flex-wrap gap-2', className)}
    >
      {TABS.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              isActive
                ? 'border-brand-blue-mid bg-brand-blue-light text-brand-blue'
                : 'border-border-strong bg-card-bg text-text-secondary hover:border-brand-blue-mid',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
