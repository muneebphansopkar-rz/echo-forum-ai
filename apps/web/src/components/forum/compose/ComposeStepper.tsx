'use client';

import { cn } from '@/lib/utils';

export type ComposeStepId = 'details' | 'formatting' | 'review';

interface Step {
  id: ComposeStepId;
  label: string;
  meta: string;
}

const STEPS: Step[] = [
  { id: 'details', label: 'Post details', meta: 'Title, tags, and body' },
  { id: 'formatting', label: 'Formatting', meta: 'Markdown with preview' },
  { id: 'review', label: 'Review', meta: 'Validate before publish' },
];

/**
 * Visual-only stepper for the compose rail. The spec says no page
 * transitions tied to these steps in the MVP, so we just highlight the
 * `active` step for context.
 */
export function ComposeStepper({
  active,
}: {
  active: ComposeStepId;
}): JSX.Element {
  return (
    <ol className="relative pl-4" aria-label="Compose progress">
      <span
        aria-hidden
        className="absolute left-[6px] top-1.5 bottom-1.5 w-px bg-border-strong/60"
      />
      {STEPS.map((step) => {
        const isActive = step.id === active;
        return (
          <li
            key={step.id}
            className={cn(
              'relative pb-6 pl-5 last:pb-0',
              isActive ? 'text-text-primary' : 'text-text-muted',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'absolute -left-px top-1 h-2.5 w-2.5 rounded-full border-2 border-page-bg',
                isActive ? 'bg-primary' : 'bg-border-strong',
              )}
            />
            <span
              className={cn(
                'block text-[14px] font-bold tracking-tight',
                isActive && 'text-text-primary',
              )}
            >
              {step.label}
            </span>
            <span className="mt-1 block text-[12.5px] font-medium leading-[1.5] text-text-muted">
              {step.meta}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
