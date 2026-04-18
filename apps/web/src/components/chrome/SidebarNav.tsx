'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  GraduationCap,
  Home,
  MessageSquare,
  Plus,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarGroup } from './SidebarGroup';
import { useMockSession } from '@/hooks/use-mock-session';

/**
 * Left sidebar for the forum shell. Mirrors the prototype layout:
 *   Feed / Build · RZ Team {Article, Course, Forum} · AI Mastery {...}
 *
 * Forum item under RZ Team is the "active" row when we're inside the
 * (forum) route group.
 */
function SidebarItem({
  href,
  label,
  icon: Icon,
  active,
  trailing,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  trailing?: React.ReactNode;
}): JSX.Element {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 px-4 py-2 text-[13.5px]',
        'text-text-secondary transition-colors hover:bg-page-bg',
        active && 'bg-brand-blue-light font-medium text-brand-blue',
      )}
    >
      <Icon
        className={cn('h-4 w-4 flex-shrink-0 opacity-70', active && 'opacity-100')}
        aria-hidden
      />
      <span>{label}</span>
      {trailing ? <span className="ml-auto">{trailing}</span> : null}
    </Link>
  );
}

function SidebarChild({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
}): JSX.Element {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 py-[7px] pl-10 pr-4 text-[13px]',
        'text-text-secondary transition-colors hover:bg-page-bg',
        active && 'bg-brand-blue-light font-medium text-brand-blue',
      )}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}

/** Routes where the global left nav should be hidden. The composer in
 *  particular needs the full width for its two-column form layout. */
const SIDEBAR_HIDDEN_ROUTES = new Set(['/submit']);

export function SidebarNav(): JSX.Element | null {
  const pathname = usePathname() ?? '/';
  const session = useMockSession();
  const onForum = !pathname.startsWith('/moderation');

  if (SIDEBAR_HIDDEN_ROUTES.has(pathname)) return null;

  return (
    <aside
      className={cn(
        'fixed left-0 top-12 hidden h-[calc(100vh-48px)] w-[248px] flex-col',
        'border-r border-border-strong bg-sidebar-bg overflow-y-auto md:flex',
      )}
    >
      <div className="flex-1 py-3">
        <SidebarItem href="/" label="Feed" icon={Home} active={pathname === '/'} />
        <SidebarItem
          href="/"
          label="Build"
          icon={Plus}
          trailing={<span className="text-base text-text-muted">···</span>}
        />

        <hr className="my-2 border-t border-border-light" />

        <SidebarGroup label="RZ Team" defaultOpen>
          <SidebarChild href="/" label="Article" icon={BookOpen} />
          <SidebarChild href="/" label="Course" icon={GraduationCap} />
          <SidebarChild
            href="/"
            label="Forum"
            icon={MessageSquare}
            active={onForum}
          />
        </SidebarGroup>

        <hr className="my-2 border-t border-border-light" />

        <SidebarGroup label="AI Mastery">
          <SidebarChild href="/" label="Article" icon={BookOpen} />
          <SidebarChild href="/" label="Course" icon={GraduationCap} />
          <SidebarChild href="/" label="Forum" icon={MessageSquare} />
        </SidebarGroup>
      </div>

      <div className="border-t border-border-light px-4 py-3">
        <div className="flex cursor-pointer items-center gap-2.5 py-2 text-[13px] text-text-secondary">
          <Settings className="h-[15px] w-[15px]" aria-hidden />
          <span>Settings</span>
        </div>
        <div className="flex items-center gap-2.5 py-1.5">
          <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-brand-blue-light text-[11px] font-semibold text-brand-blue">
            {session.platformUserId.slice(-2).toUpperCase()}
          </div>
          <div className="text-[13px] font-medium text-text-primary">
            Kashish Tanna
          </div>
          <span className="ml-auto text-text-muted">···</span>
        </div>
      </div>
    </aside>
  );
}
