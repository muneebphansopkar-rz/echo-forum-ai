'use client';

import { useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  ArrowBigUp,
  Bookmark,
  Check,
  Lock,
  LockOpen,
  Pin,
  PinOff,
  Share2,
  Tags,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToggleVote, type PostDetail } from '@/hooks/use-posts';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { useModerationAction } from '@/hooks/use-moderation';
import { useMockSession } from '@/hooks/use-mock-session';
import { useShare } from '@/hooks/use-share';
import { TagPicker } from '../compose/TagPicker';
import { Markdown } from './Markdown';
import type { PostSummary } from '@/lib/zod/common';

interface PostDetailCardProps {
  post: PostDetail;
}

/** Bookmarks store expects a PostSummary; drop the detail-only fields. */
function toSummary(p: PostDetail): PostSummary {
  return {
    id: p.id,
    title: p.title,
    excerpt: p.excerpt,
    authorId: p.authorId,
    authorDisplayName: p.authorDisplayName,
    tags: p.tags,
    upvoteCount: p.upvoteCount,
    replyCount: p.replyCount,
    isPinned: p.isPinned,
    isLocked: p.isLocked,
    isViewerUpvoted: p.isViewerUpvoted,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function PostDetailCard({ post }: PostDetailCardProps): JSX.Element {
  const toggleVote = useToggleVote();
  const bookmarks = useBookmarks();
  const moderate = useModerationAction();
  const { role } = useMockSession();
  const { state: shareState, share } = useShare();

  const currentTagIds = post.tags.map((t) => t.id);
  const [retagOpen, setRetagOpen] = useState(false);
  const [pendingTagIds, setPendingTagIds] = useState<string[]>(currentTagIds);
  const [retagError, setRetagError] = useState<string | null>(null);

  const primaryTag = post.tags[0];
  const isSaved = bookmarks.isSaved(post.id);
  const isModerator = role !== 'MEMBER';

  const handleVote = () => {
    if (toggleVote.isPending) return;
    toggleVote.mutate({ targetType: 'post', targetId: post.id });
  };

  const handleSave = () => bookmarks.toggle(toSummary(post));

  const handleShare = () =>
    void share({
      title: post.title,
      text: post.excerpt,
      pathname: `/p/${post.id}`,
    });

  const handleTogglePin = () => {
    if (moderate.isPending) return;
    moderate.mutate({ kind: 'pin', postId: post.id, pinned: !post.isPinned });
  };

  const handleToggleLock = () => {
    if (moderate.isPending) return;
    moderate.mutate({ kind: 'lock', postId: post.id, locked: !post.isLocked });
  };

  const openRetag = () => {
    setPendingTagIds(currentTagIds);
    setRetagError(null);
    setRetagOpen(true);
  };

  const applyRetag = () => {
    if (pendingTagIds.length < 1 || pendingTagIds.length > 3) {
      setRetagError('Pick 1–3 tags to continue.');
      return;
    }
    moderate.mutate(
      {
        kind: 'retag',
        postId: post.id,
        tagIds: pendingTagIds,
        previousTagIds: currentTagIds,
      },
      {
        onSuccess: () => {
          setRetagOpen(false);
          setRetagError(null);
        },
      },
    );
  };

  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {primaryTag && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {primaryTag.label}
          </span>
        )}
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
      </div>

      <h1 className="mb-2 text-xl font-bold leading-snug text-foreground">
        {post.title}
      </h1>

      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">
          {post.authorDisplayName}
        </span>
        <span className="rounded border border-primary/40 bg-primary/10 px-1 py-px text-[10px] font-semibold uppercase text-primary">
          OP
        </span>
        <span aria-hidden>·</span>
        <span>
          {formatDistanceToNowStrict(new Date(post.createdAt), {
            addSuffix: true,
          })}
        </span>
        {post.editedAt && (
          <>
            <span aria-hidden>·</span>
            <span>
              edited{' '}
              {formatDistanceToNowStrict(new Date(post.editedAt), {
                addSuffix: true,
              })}
            </span>
          </>
        )}
      </div>

      <Markdown source={post.body} className="text-foreground/90" />

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={handleVote}
          aria-pressed={post.isViewerUpvoted}
          className={cn(
            'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
            post.isViewerUpvoted
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
          )}
        >
          <ArrowBigUp className="h-4 w-4" aria-hidden />
          Upvote
          <span className="tabular-nums">{post.upvoteCount}</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          aria-label={shareState === 'copied' ? 'Link copied' : 'Share this post'}
          className={cn(
            'inline-flex items-center gap-1.5 text-xs transition-colors',
            shareState === 'copied'
              ? 'text-green-600'
              : 'text-muted-foreground hover:text-primary',
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
            'inline-flex items-center gap-1.5 text-xs transition-colors',
            isSaved ? 'text-primary' : 'text-muted-foreground hover:text-primary',
          )}
        >
          <Bookmark
            className={cn('h-3.5 w-3.5', isSaved && 'fill-primary')}
            aria-hidden
          />
          {isSaved ? 'Saved' : 'Save'}
        </button>

        {isModerator && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <ModButton
              onClick={handleTogglePin}
              disabled={moderate.isPending}
              active={post.isPinned}
              icon={post.isPinned ? PinOff : Pin}
              label={post.isPinned ? 'Unpin' : 'Pin'}
              tone="amber"
            />
            <ModButton
              onClick={handleToggleLock}
              disabled={moderate.isPending}
              active={post.isLocked}
              icon={post.isLocked ? LockOpen : Lock}
              label={post.isLocked ? 'Unlock' : 'Lock'}
              tone="red"
            />
            <ModButton
              onClick={openRetag}
              disabled={moderate.isPending}
              active={retagOpen}
              icon={Tags}
              label="Retag"
              tone="purple"
            />
          </div>
        )}
      </div>

      {isModerator && retagOpen && (
        <div className="mt-4 rounded-md border border-border-light bg-page-bg p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <div className="text-[13px] font-semibold text-text-primary">
                Override tags
              </div>
              <div className="text-[11px] text-text-muted">
                Replaces the current tag set. Logged as a moderation action.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRetagOpen(false)}
              aria-label="Close retag panel"
              className="rounded-md p-1 text-text-muted hover:bg-card-bg hover:text-text-primary"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <TagPicker
            value={pendingTagIds}
            onChange={setPendingTagIds}
            error={retagError ?? undefined}
          />

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setRetagOpen(false)}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-card-bg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyRetag}
              disabled={
                moderate.isPending ||
                pendingTagIds.length === 0 ||
                pendingTagIds.length > 3
              }
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white',
                'hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              {moderate.isPending ? 'Applying…' : 'Apply tags'}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

/** Single-shape moderator action button so Pin / Lock / Retag stay visually aligned. */
function ModButton({
  onClick,
  disabled,
  active,
  icon: Icon,
  label,
  tone,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  // Loose icon type — lucide's LucideIcon has a stricter `aria-hidden`
  // signature than React's default, so we just require a `className`.
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone: 'amber' | 'red' | 'purple';
}): JSX.Element {
  const toneClass: Record<typeof tone, string> = {
    amber: cn(
      'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100',
      active && 'border-amber-400 bg-amber-100',
    ),
    red: cn(
      'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
      active && 'border-red-400 bg-red-100',
    ),
    purple: cn(
      'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100',
      active && 'border-purple-400 bg-purple-100',
    ),
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60',
        toneClass[tone],
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
