'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarGroupProps {
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Collapsible group block in the left sidebar (RZ Team, AI Mastery, etc.).
 * Group labels are always text — never icon-only — per UI rule #8.
 */
export function SidebarGroup({
  label,
  defaultOpen = false,
  children,
}: SidebarGroupProps): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-2.5 px-4 py-2 text-left',
          'text-[13.5px] font-medium text-text-primary',
          'hover:bg-page-bg',
        )}
      >
        <Users className="h-4 w-4 opacity-70" aria-hidden />
        <span>{label}</span>
        <ChevronDown
          className={cn(
            'ml-auto h-3 w-3 transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      {open ? <div className="pb-1">{children}</div> : null}
    </div>
  );
}
