import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Small reusable back link used at the top of inner screens (submit,
 * search, bookmarks, thread). Default target is the Hot feed.
 */
export function BackLink({
  href = '/',
  label = 'Back to Forum',
  className,
}: {
  href?: string;
  label?: string;
  className?: string;
}): JSX.Element {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium text-text-muted transition-colors hover:text-brand-blue',
        className,
      )}
    >
      <ChevronLeft className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  );
}
