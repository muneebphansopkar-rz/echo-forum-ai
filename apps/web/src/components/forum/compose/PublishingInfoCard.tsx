import { cn } from '@/lib/utils';

export function PublishingInfoCard({
  className,
}: {
  className?: string;
}): JSX.Element {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Feed placement', value: 'Shown immediately' },
    { label: 'Edit window', value: '15 minutes' },
    { label: 'Format', value: 'Markdown only' },
  ];
  return (
    <div
      className={cn(
        'rounded-lg border border-border-strong bg-card-bg p-5 shadow-skep-sm',
        className,
      )}
    >
      <div className="mb-3.5 text-sm font-bold tracking-tight text-text-primary">
        Publishing behavior
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center justify-between gap-3 text-[13px] text-text-secondary"
          >
            <span>{r.label}</span>
            <strong className="font-semibold text-text-primary">{r.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
