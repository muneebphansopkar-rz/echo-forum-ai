'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMockSession } from '@/hooks/use-mock-session';

/**
 * Dark back-bar used by /moderation (and other fullscreen views).
 * Mirrors .fullview-header in the reference HTML.
 */
export function ModTopBar({
  context,
  backHref = '/',
  className,
}: {
  context: string;
  backHref?: string;
  className?: string;
}): JSX.Element {
  const session = useMockSession();
  return (
    <header
      className={cn(
        'flex h-16 items-center justify-between gap-4 border-b border-border-strong',
        'bg-navy px-6 text-white',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className={cn(
            'inline-flex items-center gap-2.5 text-[15px] font-semibold text-white',
            'hover:text-white/80',
          )}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
          Back to Forum
        </Link>
        <span className="text-[15px] font-semibold text-white/90">{context}</span>
        <span
          className={cn(
            'inline-flex items-center rounded-full bg-white/10 px-2.5 py-1',
            'text-xs font-semibold text-white',
          )}
        >
          {session.role}
        </span>
      </div>
      <div
        className={cn(
          'flex h-[30px] w-[30px] items-center justify-center rounded-full',
          'bg-status-pinned-bg text-[11px] font-semibold text-status-pinned',
        )}
      >
        {session.platformUserId.slice(-2).toUpperCase()}
      </div>
    </header>
  );
}
