'use client';

import { cn } from '@/lib/utils';
import type { ModQueueBucket } from '@/lib/query-keys';
import type { QueueCounts } from '@/lib/zod/moderation';

interface Item {
  id: ModQueueBucket;
  label: string;
  accent: 'red' | 'amber' | 'neutral';
}

const ITEMS: Item[] = [
  { id: 'all', label: 'All items', accent: 'red' },
  { id: 'hidden_replies', label: 'Hidden replies', accent: 'red' },
  { id: 'pinned', label: 'Pinned posts', accent: 'amber' },
  { id: 'locked', label: 'Locked threads', accent: 'amber' },
  { id: 'tag_overrides', label: 'Tag overrides', accent: 'neutral' },
];

const TOOLS = ['Manage tags', 'Member roles', 'Audit log'];

function countFor(bucket: ModQueueBucket, counts?: QueueCounts): number {
  if (!counts) return 0;
  if (bucket === 'all') return counts.all;
  return counts[bucket] ?? 0;
}

const ACCENT_BG: Record<Item['accent'], string> = {
  red: 'bg-status-locked-bg text-status-locked',
  amber: 'bg-status-pinned-bg text-status-pinned',
  neutral: 'bg-page-bg text-text-muted',
};

export function ModQueueSidebar({
  active,
  onChange,
  counts,
  className,
}: {
  active: ModQueueBucket;
  onChange: (next: ModQueueBucket) => void;
  counts?: QueueCounts;
  className?: string;
}): JSX.Element {
  return (
    <aside
      className={cn(
        'hidden w-[220px] flex-shrink-0 border-r border-border-strong bg-page-bg py-4 md:block',
        className,
      )}
    >
      <div className="px-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        Queue
      </div>
      <nav aria-label="Moderation queue filter">
        {ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex w-full items-center gap-2 px-4 py-[7px] text-[13px] transition-colors',
                isActive
                  ? 'bg-brand-blue-light font-semibold text-brand-blue'
                  : 'text-text-secondary hover:bg-card-bg',
              )}
            >
              <span>{item.label}</span>
              <span
                className={cn(
                  'ml-auto rounded-full px-1.5 py-px text-[11px]',
                  ACCENT_BG[item.accent],
                )}
              >
                {countFor(item.id, counts)}
              </span>
            </button>
          );
        })}
      </nav>
      <hr className="my-2 border-t border-border-light" />
      <div className="px-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        Tools
      </div>
      {TOOLS.map((label) => (
        <div
          key={label}
          className="px-4 py-[7px] text-[13px] text-text-secondary"
        >
          {label}
        </div>
      ))}
    </aside>
  );
}
