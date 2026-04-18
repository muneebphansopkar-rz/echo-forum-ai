'use client';

import { ArrowRight, EyeOff, Lock, Tag as TagIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Placeholder quick-action buttons — 4-up grid at the bottom of the mod
 * screen. These are intentionally inert for MVP; they advertise the
 * canonical entry points for per-post moderation that would normally
 * happen from within the thread view.
 */
const ACTIONS = [
  { label: 'Pin a post', icon: ArrowRight },
  { label: 'Lock a thread', icon: Lock },
  { label: 'Hide a reply', icon: EyeOff },
  { label: 'Remove tag', icon: TagIcon },
];

export function QuickActionsGrid({
  className,
}: {
  className?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        'mt-4 rounded-lg border border-border-strong bg-card-bg p-3.5',
        className,
      )}
    >
      <div className="mb-2.5 text-[12.5px] font-semibold text-text-secondary">
        Quick actions
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            disabled
            className={cn(
              'flex items-center gap-2 rounded-md border border-border-strong bg-page-bg',
              'px-3 py-2.5 text-[12.5px] text-text-secondary transition-colors',
              'hover:border-brand-blue-mid hover:bg-brand-blue-light hover:text-brand-blue',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
