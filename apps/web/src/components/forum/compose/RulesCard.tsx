import { cn } from '@/lib/utils';

/**
 * Rail info card — mirrors `.compose-rail-card` in the prototype.
 * Kept to a single decorative icon per section (UI rule #6) by shipping
 * none here.
 */
export function RulesCard({ className }: { className?: string }): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-lg border border-border-strong bg-card-bg p-5 shadow-skep-sm',
        className,
      )}
    >
      <h4 className="mb-2.5 text-sm font-bold tracking-tight text-text-primary">
        Post rules
      </h4>
      <p className="text-[12.5px] leading-[1.7] text-text-secondary">
        Title is limited to 200 characters. Body supports Markdown only and can
        contain up to 10,000 characters. Add at least one tag and no more than
        three.
      </p>
    </div>
  );
}
