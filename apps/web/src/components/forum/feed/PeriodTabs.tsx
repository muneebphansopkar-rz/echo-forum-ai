'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { TopWindow } from '@/lib/query-keys';

interface PeriodTabsProps {
  active: TopWindow;
  /** base href that the window param appends to — defaults to /top. */
  basePath?: string;
}

const TABS: ReadonlyArray<{ id: TopWindow; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'all', label: 'All time' },
];

export function PeriodTabs({
  active,
  basePath = '/top',
}: PeriodTabsProps): JSX.Element {
  return (
    <div
      role="tablist"
      aria-label="Time window"
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary p-0.5"
    >
      {TABS.map(({ id, label }) => {
        const isActive = id === active;
        const href = id === 'today' ? basePath : `${basePath}?w=${id}`;
        return (
          <Link
            key={id}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-colors',
              isActive
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
