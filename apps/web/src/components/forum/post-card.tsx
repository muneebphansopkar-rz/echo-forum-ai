'use client';

import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  ArrowBigUp,
  Bookmark,
  Check,
  Lock,
  MessageSquare,
  Pin,
  Share2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToggleVote, type PostSummary } from '@/hooks/use-posts';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { useShare } from '@/hooks/use-share';

interface PostCardProps {
  post: PostSummary;
}

export function PostCard({ post }: PostCardProps): JSX.Element {
  const primaryTag = post.tags[0];
  const toggleVote = useToggleVote();
  const bookmarks = useBookmarks();
  const { state: shareState, share } = useShare();
  const isSaved = bookmarks.isSaved(post.id);

  const handleVote = () => {
    if (toggleVote.isPending) return;
    toggleVote.mutate({ targetType: 'post', targetId: post.id });
  };

  const handleSave = () => bookmarks.toggle(post);

  const handleShare = () =>
    void share({
      title: post.title,
      text: post.excerpt,
      pathname: `/p/${post.id}`,
    });

  return (
    <Card className="flex gap-3 p-4 transition-shadow hover:shadow-md">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <button
          type="button"
          onClick={handleVote}
          aria-pressed={post.isViewerUpvoted}
          aria-label={post.isViewerUpvoted ? 'Remove upvote' : 'Upvote post'}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors',
            post.isViewerUpvoted
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
          )}
        >
          <ArrowBigUp className="h-4 w-4" aria-hidden />
        </button>
        <span
          className={cn(
            'text-xs font-semibold tabular-nums',
            post.isViewerUpvoted ? 'text-primary' : 'text-foreground',
          )}
        >
          {post.upvoteCount}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          {post.isPinned && (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
              <Pin className="h-3 w-3" aria-hidden />
              Pinned
            </span>
          )}
          {post.isLocked && (
            <span className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-1.5 py-0.5 text-[11px] font-medium text-destructive">
              <Lock className="h-3 w-3" aria-hidden />
              Locked
            </span>
          )}
          {primaryTag && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {primaryTag.label}
            </span>
          )}
        </div>

        <Link
          href={`/p/${post.id}`}
          className="block font-semibold leading-snug text-foreground hover:text-primary"
        >
          {post.title}
        </Link>

        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
          <span className="font-medium text-muted-foreground/90">
            {post.authorDisplayName}
          </span>
          <span aria-hidden>·</span>
          <span>
            {formatDistanceToNowStrict(new Date(post.createdAt), {
              addSuffix: true,
            })}
          </span>
          <span aria-hidden>·</span>
          <span>{post.replyCount} replies</span>
        </div>

        {post.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        )}

        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <Link
            href={`/p/${post.id}`}
            className="inline-flex items-center gap-1 hover:text-primary"
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden />
            {post.replyCount} replies
          </Link>
          <button
            type="button"
            onClick={handleShare}
            aria-label={
              shareState === 'copied' ? 'Link copied' : 'Share this post'
            }
            className={cn(
              'inline-flex items-center gap-1 transition-colors',
              shareState === 'copied'
                ? 'text-green-600'
                : 'hover:text-primary',
            )}
          >
            {shareState === 'copied' ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden />
                Link copied
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5" aria-hidden />
                Share
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleSave}
            aria-pressed={isSaved}
            aria-label={isSaved ? 'Remove from bookmarks' : 'Save to bookmarks'}
            className={cn(
              'inline-flex items-center gap-1 transition-colors',
              isSaved ? 'text-primary' : 'hover:text-primary',
            )}
          >
            <Bookmark
              className={cn('h-3.5 w-3.5', isSaved && 'fill-primary')}
              aria-hidden
            />
            {isSaved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </Card>
  );
}
