'use client';

import Link from 'next/link';
import { Bookmark } from 'lucide-react';
import { PostCard } from '@/components/forum/post-card';
import { Button } from '@/components/ui/button';
import { useBookmarks } from '@/hooks/use-bookmarks';

/**
 * /bookmarks — lists posts the caller has saved via the Save action on
 * any PostCard. Persists client-side (see use-bookmarks.ts) so it works
 * without a backend `forum_bookmarks` table; swap the storage adapter
 * when that lands.
 */
export default function BookmarksPage(): JSX.Element {
  const bookmarks = useBookmarks();
  const items = bookmarks.items;

  return (
    <div className="mx-auto w-full max-w-[820px] px-6 py-5 space-y-4">
      <header className="flex items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Bookmark className="h-5 w-5 text-brand-blue" aria-hidden />
          <div>
            <h1 className="text-lg font-semibold text-text-primary">
              My bookmarks
            </h1>
            <p className="text-xs text-text-muted">
              Saved in this browser — scoped to the current community.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-brand-blue-light px-2 py-0.5 text-[11px] font-medium text-brand-blue">
          {items.length} saved
        </span>
      </header>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <Bookmark
            className="mx-auto mb-3 h-6 w-6 text-text-muted"
            aria-hidden
          />
          <p className="text-sm font-medium text-text-primary">
            No bookmarks yet.
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Hit{' '}
            <span className="inline-flex items-center gap-1 rounded-sm bg-secondary px-1.5 py-0.5 font-medium">
              <Bookmark className="h-3 w-3" aria-hidden />
              Save
            </span>{' '}
            on any post to add it here.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-4">
            <Link href="/">Back to feed</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          <p className="py-3 text-center text-xs text-text-muted">
            {items.length === 1 ? '1 saved post' : `${items.length} saved posts`}.
          </p>
        </div>
      )}
    </div>
  );
}
