import { cn } from '@/lib/utils';

export function ReferencesCard({
  className,
}: {
  className?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-lg border border-border-strong bg-card-bg p-5 shadow-skep-sm',
        className,
      )}
    >
      <h4 className="mb-2.5 text-sm font-bold tracking-tight text-text-primary">
        References used
      </h4>
      <p className="text-[12.5px] leading-[1.7] text-text-secondary">
        Layout borrows the structured full-screen workflow from authoring
        tools, while tags, threaded discussion expectations, and moderation
        affordances follow patterns common in Reddit, Quora, and Drupal.
      </p>
    </div>
  );
}
