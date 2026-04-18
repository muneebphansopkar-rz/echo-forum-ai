'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { TopBar } from '@/components/chrome/TopBar';
import { SidebarNav } from '@/components/chrome/SidebarNav';
import { ForumHeader } from '@/components/chrome/ForumHeader';
import { ForumRightPanel } from '@/components/chrome/ForumRightPanel';
import { cn } from '@/lib/utils';

/**
 * Forum shell — dark navy topbar + left sidebar (RZ Team / AI Mastery)
 * + white per-screen content header + right-side highlights panel.
 * Mirrors html/skep-forum-updated.html. Moderation uses a separate
 * fullscreen layout outside this route group.
 *
 * `/submit` hides the left sidebar so the composer's two-column form
 * gets the full viewport width; we drop the matching `pl-248` offset
 * here instead of leaving a blank gutter.
 */
const SIDEBAR_HIDDEN_ROUTES = new Set(['/submit']);

export default function ForumLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const pathname = usePathname() ?? '/';
  const hideSidebar = SIDEBAR_HIDDEN_ROUTES.has(pathname);

  return (
    <div className="min-h-screen bg-page-bg">
      <TopBar />
      <SidebarNav />
      <main
        className={cn(
          'flex min-h-screen flex-col pt-12',
          hideSidebar ? 'pl-0' : 'md:pl-[248px]',
        )}
      >
        <ForumHeader />
        <div className="flex min-h-[calc(100vh-48px-56px)] flex-1">
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
          <ForumRightPanel />
        </div>
      </main>
    </div>
  );
}
