'use client';

import { cn } from '@/lib/utils';

export type WritePreviewMode = 'write' | 'preview';

interface WritePreviewTabsProps {
  mode: WritePreviewMode;
  onChange: (mode: WritePreviewMode) => void;
  className?: string;
}

export function WritePreviewTabs({
  mode,
  onChange,
  className,
}: WritePreviewTabsProps): JSX.Element {
  return (
    <div
      role="tablist"
      aria-label="Editor mode"
      className={cn(
        'mb-3.5 inline-flex gap-1 rounded-lg border border-border-strong bg-card-bg p-1',
        className,
      )}
    >
      {(['write', 'preview'] as const).map((m) => {
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(m)}
            className={cn(
              'rounded-md px-3.5 py-2 text-[12.5px] font-semibold transition-colors',
              active
                ? 'bg-brand-blue-light text-brand-blue'
                : 'text-text-secondary hover:bg-page-bg',
            )}
          >
            {m === 'write' ? 'Write' : 'Preview'}
          </button>
        );
      })}
    </div>
  );
}
