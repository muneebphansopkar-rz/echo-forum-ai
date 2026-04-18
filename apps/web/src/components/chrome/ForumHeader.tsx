'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, ChevronLeft, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { cn } from '@/lib/utils';

/**
 * White content-header bar — ported from `.content-header` in
 * html/skep-forum-updated.html.
 *
 * Two variants, picked from the current pathname:
 *   • **feed** — on `/`, `/new`, `/top`: Forum title + RZ Team badge ·
 *     Search / New post / My bookmark.
 *   • **inner** — anywhere else: "Back to Forum" + a small uppercase
 *     label showing which screen the user is on. Inner pages no longer
 *     need their own stand-alone back links.
 */
const FEED_ROUTES = new Set(['/', '/new', '/top']);

export function ForumHeader({ className }: { className?: string }): JSX.Element {
  const pathname = usePathname() ?? '/';
  const isFeed = FEED_ROUTES.has(pathname);

  return (
    <header
      className={cn(
        'sticky top-12 z-[50] flex h-14 flex-shrink-0 items-center justify-between',
        'border-b border-border-strong bg-card-bg px-6',
        className,
      )}
    >
      {isFeed ? <FeedHeaderContent /> : <InnerHeaderContent pathname={pathname} />}
    </header>
  );
}

function FeedHeaderContent(): JSX.Element {
  const bookmarks = useBookmarks();
  return (
    <>
      <div className="flex items-center gap-3">
        <h1 className="text-[17px] font-semibold text-text-primary">Forum</h1>
        <span className="inline-flex items-center rounded-full bg-brand-blue-light px-2 py-0.5 text-[11px] font-medium text-brand-blue">
          RZ Team
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link href="/search">
            <Search className="h-3.5 w-3.5" aria-hidden />
            Search
          </Link>
        </Button>
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/submit">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            New post
          </Link>
        </Button>
        <Link
          href="/bookmarks"
          className="hidden items-center gap-1.5 text-xs text-text-muted hover:text-text-primary md:inline-flex"
          aria-label={`My bookmarks (${bookmarks.count})`}
        >
          <Bookmark className="h-3.5 w-3.5" aria-hidden />
          My bookmark
          {bookmarks.count > 0 ? (
            <span className="rounded-full bg-brand-blue-light px-1.5 text-[10px] font-semibold text-brand-blue">
              {bookmarks.count}
            </span>
          ) : null}
        </Link>
      </div>
    </>
  );
}

function InnerHeaderContent({ pathname }: { pathname: string }): JSX.Element {
  const label = labelFor(pathname);
  return (
    <>
      <Link
        href="/"
        className={cn(
          'inline-flex items-center gap-1.5 text-sm font-medium',
          'text-text-secondary transition-colors hover:text-brand-blue',
        )}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Back to Forum
      </Link>
      {label ? (
        <span className="text-[11px] uppercase tracking-[0.08em] text-text-muted">
          {label}
        </span>
      ) : null}
    </>
  );
}

function labelFor(pathname: string): string | null {
  if (pathname.startsWith('/p/')) return 'Thread';
  if (pathname === '/submit') return 'New post';
  if (pathname === '/search') return 'Search';
  if (pathname === '/bookmarks') return 'Bookmarks';
  return null;
}
