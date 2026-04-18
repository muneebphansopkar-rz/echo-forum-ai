'use client';

import { usePost } from '@/hooks/use-posts';
import { PostDetailCard } from '@/components/forum/thread/PostDetailCard';
import { ReplyTree } from '@/components/forum/thread/ReplyTree';
import { ReplyComposer } from '@/components/forum/thread/ReplyComposer';
import { LockedBanner } from '@/components/forum/thread/LockedBanner';

interface PageProps {
  params: { postId: string };
}

/**
 * Thread view — the inline back link moved into the content header (see
 * `ForumHeader`) so the top chrome stays consistent with the rest of the
 * app. Content width mirrors the feed's 820 px column for vertical rhythm.
 */
export default function PostDetailPage({ params }: PageProps): JSX.Element {
  const { postId } = params;
  const { data: post, isLoading, isError, error } = usePost(postId);

  return (
    <div className="mx-auto w-full max-w-[820px] space-y-4 px-6 py-6">
      {isLoading && (
        <div className="space-y-3" aria-busy="true">
          <div className="h-40 animate-pulse rounded-lg border border-border bg-card" />
          <div className="h-24 animate-pulse rounded-lg border border-border bg-card" />
          <div className="h-24 animate-pulse rounded-lg border border-border bg-card" />
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Couldn&rsquo;t load this thread:{' '}
          {error instanceof Error ? error.message : 'unknown error'}
        </div>
      )}

      {post && (
        <>
          {post.isLocked && <LockedBanner />}

          <PostDetailCard post={post} />

          <ReplyTree
            postId={post.id}
            opAuthorId={post.authorId}
            locked={post.isLocked}
          />

          {post.isLocked ? (
            <div className="rounded-lg border border-border bg-secondary/60 p-4 text-sm text-muted-foreground">
              Thread is locked — new replies are disabled.
            </div>
          ) : (
            <ReplyComposer postId={post.id} />
          )}
        </>
      )}
    </div>
  );
}
