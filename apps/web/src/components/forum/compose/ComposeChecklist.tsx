import { cn } from '@/lib/utils';

export interface ChecklistState {
  title: boolean;
  tagCount: number;
  body: boolean;
  previewSeen: boolean;
}

export function ComposeChecklist({
  state,
  className,
}: {
  state: ChecklistState;
  className?: string;
}): JSX.Element {
  const rows: Array<{ label: string; value: string; ok: boolean }> = [
    {
      label: 'Title',
      value: state.title ? 'Ready' : 'Needed',
      ok: state.title,
    },
    {
      label: 'Tags',
      value:
        state.tagCount === 0
          ? 'Pick 1–3'
          : `${state.tagCount} selected`,
      ok: state.tagCount >= 1 && state.tagCount <= 3,
    },
    {
      label: 'Body',
      value: state.body ? 'Ready' : 'Needed',
      ok: state.body,
    },
    {
      label: 'Preview',
      value: state.previewSeen ? 'Synced' : 'Open once',
      ok: state.previewSeen,
    },
  ];
  return (
    <div
      className={cn(
        'rounded-lg border border-border-strong bg-card-bg p-5 shadow-skep-sm',
        className,
      )}
    >
      <div className="mb-3.5 text-sm font-bold tracking-tight text-text-primary">
        Live checklist
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center justify-between gap-3 text-[13px] text-text-secondary"
          >
            <span>{r.label}</span>
            <strong
              className={cn(
                'font-semibold',
                r.ok ? 'text-text-primary' : 'text-status-locked',
              )}
            >
              {r.value}
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
