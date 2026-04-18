import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ModSectionProps {
  label: string;
  children: ReactNode;
  className?: string;
  hidden?: boolean;
}

/**
 * Labelled grouping for a set of moderation cards. Renders nothing when
 * `hidden` is true so the active filter can hide irrelevant buckets.
 */
export function ModSection({
  label,
  children,
  className,
  hidden,
}: ModSectionProps): JSX.Element | null {
  if (hidden) return null;
  return (
    <section className={cn('mb-5', className)}>
      <div
        className={cn(
          'mb-2 text-[12px] font-semibold uppercase tracking-wider text-text-secondary',
        )}
      >
        {label}
      </div>
      <div className="overflow-hidden rounded-lg border border-border-strong bg-card-bg shadow-skep-sm">
        {children}
      </div>
    </section>
  );
}
