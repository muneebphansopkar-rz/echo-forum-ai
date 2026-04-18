import { cn } from '@/lib/utils';
import type { QueueCounts } from '@/lib/zod/moderation';

/**
 * Three inline cards summarising the state of the queue.
 * Rendered inline (no floating grid) per UI rule #5.
 */
export function ModSummaryCards({
  counts,
  className,
}: {
  counts?: QueueCounts;
  className?: string;
}): JSX.Element {
  const items: Array<{ label: string; value: number; note: string }> = [
    {
      label: 'Hidden replies',
      value: counts?.hidden_replies ?? 0,
      note: 'Awaiting restore or deletion',
    },
    {
      label: 'Pinned posts',
      value: counts?.pinned ?? 0,
      note: 'Always shown at top of feed',
    },
    {
      label: 'Locked threads',
      value: counts?.locked ?? 0,
      note: 'Rejecting new replies',
    },
  ];
  return (
    <div
      className={cn(
        'mb-5 grid grid-cols-1 gap-3 md:grid-cols-3',
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border-strong bg-card-bg px-4 py-3.5 shadow-skep-sm"
        >
          <div className="text-[11px] uppercase tracking-wider text-text-muted">
            {item.label}
          </div>
          <div className="mt-2 text-[22px] font-extrabold text-text-primary">
            {item.value}
          </div>
          <div className="mt-1.5 text-xs text-text-secondary">{item.note}</div>
        </div>
      ))}
    </div>
  );
}
