'use client';

import { ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMockSession, type MockSession } from '@/hooks/use-mock-session';

/**
 * Dark navy top strip — ported from .topbar in html/skep-forum-updated.html.
 *
 * Includes a tiny debug role switcher (non-production only) so smoke testing
 * the moderation gating is a one-click affair. Per F2 scope.
 */
const ROLES: MockSession['role'][] = ['MEMBER', 'MODERATOR', 'ADMIN', 'OWNER'];

export function TopBar({ className }: { className?: string }): JSX.Element {
  const session = useMockSession();
  const showDebug = process.env.NODE_ENV !== 'production';

  return (
    <div
      className={cn(
        'fixed inset-x-0 top-0 z-[100] flex h-12 items-center gap-3 bg-navy px-4',
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-md bg-brand-blue text-[13px] font-bold text-white">
          RI
        </div>
        <span className="text-sm font-semibold text-white">Rezolut Infotech</span>
        <ChevronsRight
          className="ml-0.5 h-3 w-3 text-text-muted"
          aria-hidden
        />
      </div>
      <div className="h-5 w-px bg-white/10" aria-hidden />

      <div className="ml-auto flex items-center gap-3">
        {showDebug ? (
          <label className="flex items-center gap-2 text-xs text-white/70">
            <span className="uppercase tracking-wide">Role</span>
            <select
              aria-label="Debug: switch session role"
              value={session.role}
              onChange={(e) =>
                session.setRole(e.target.value as MockSession['role'])
              }
              className={cn(
                'rounded-sm border border-white/20 bg-navy-hover px-2 py-1',
                'text-xs font-medium text-white outline-none',
                'focus:border-brand-blue',
              )}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </div>
  );
}
