'use client';

import Link from 'next/link';
import { Clock, Flame, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FeedKind } from '@/lib/query-keys';

interface SortTabsProps {
  active: FeedKind;
}

const TABS: ReadonlyArray<{
  id: FeedKind;
  label: string;
  href: string;
  Icon: typeof Flame;
}> = [
  { id: 'hot', label: 'Hot', href: '/', Icon: Flame },
  { id: 'new', label: 'New', href: '/new', Icon: Clock },
  { id: 'top', label: 'Top', href: '/top', Icon: TrendingUp },
];

export function SortTabs({ active }: SortTabsProps): JSX.Element {
  return (
    <div
      role="tablist"
      aria-label="Sort posts"
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm"
    >
      {TABS.map(({ id, label, href, Icon }) => {
        const isActive = id === active;
        return (
          <Link
            key={id}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
