'use client';

import { useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { ArrowBigUp, CornerDownRight, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToggleVote, type Reply } from '@/hooks/use-posts';
import { useModerationAction } from '@/hooks/use-moderation';
import { useMockSession } from '@/hooks/use-mock-session';
import { Markdown } from './Markdown';
import { HiddenReplyPlaceholder } from './HiddenReplyPlaceholder';
import { ReplyComposer } from './ReplyComposer';

interface ReplyCardProps {
  reply: Reply;
  postId: string;
  /** Id of the OP author so we can flag "OP" on replies. */
  opAuthorId?: string;
  /** True when the thread is locked (disables reply action). */
  locked?: boolean;
  /** Depth is capped at 2 in the contract — we render further nesting as flat. */
  depth: 1 | 2;
  /** Level-2 replies rendered nested under their parent. */
  childReplies?: Reply[];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '');
}

export function ReplyCard({
  reply,
  postId,
  opAuthorId,
  locked,
  depth,
  childReplies,
}: ReplyCardProps): JSX.Element {
  const [replying, setReplying] = useState(false);
  const toggleVote = useToggleVote();
  const moderate = useModerationAction();
  const { role } = useMockSession();
  const isModerator = role !== 'MEMBER';
  const isHidden = Boolean(reply.hiddenAt);
  const isOP = opAuthorId && opAuthorId === reply.authorId;

  const handleVote = () => {
    if (toggleVote.isPending) return;
    toggleVote.mutate({ targetType: 'reply', targetId: reply.id, postId });
  };

  const handleToggleHide = () => {
    if (moderate.isPending) return;
    moderate.mutate(
      isHidden
        ? {
            kind: 'restore',
            targetType: 'reply',
            targetId: reply.id,
            postId,
          }
        : {
            kind: 'hide',
            targetType: 'reply',
            targetId: reply.id,
            postId,
          },
    );
  };

  return (
    <div
      className={cn(
        'flex gap-3 border-b border-border/70 py-4',
        depth === 2 && 'border-b-0 py-3',
      )}
    >
      <div
        className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold uppercase text-primary"
        aria-hidden
      >
        {initials(reply.authorDisplayName)}
      </div>

      <div
        className={cn(
          'min-w-0 flex-1',
          isHidden && isModerator && 'opacity-70',
        )}
      >
        {isHidden && !isModerator ? (
          <HiddenReplyPlaceholder />
        ) : (
          <>
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {reply.authorDisplayName}
              </span>
              {isOP && (
                <span className="rounded border border-primary/40 bg-primary/10 px-1 py-px text-[10px] font-semibold uppercase text-primary">
                  OP
                </span>
              )}
              <span aria-hidden>·</span>
              <span>
                {formatDistanceToNowStrict(new Date(reply.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>

            <Markdown
              source={reply.body}
              className="space-y-2 text-[13.5px] text-foreground/90"
            />

            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={handleVote}
                aria-pressed={reply.isViewerUpvoted}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 transition-colors',
                  reply.isViewerUpvoted
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-transparent hover:border-border hover:text-primary',
                )}
              >
                <ArrowBigUp className="h-3.5 w-3.5" aria-hidden />
                <span className="tabular-nums">{reply.upvoteCount}</span>
              </button>

              {!locked && depth === 1 && !isHidden && (
                <button
                  type="button"
                  onClick={() => setReplying((v) => !v)}
                  className="inline-flex items-center gap-1 hover:text-primary"
                >
                  <CornerDownRight className="h-3.5 w-3.5" aria-hidden />
                  Reply
                </button>
              )}

              {isModerator && (
                <button
                  type="button"
                  onClick={handleToggleHide}
                  disabled={moderate.isPending}
                  aria-pressed={isHidden}
                  aria-label={isHidden ? 'Restore reply' : 'Hide reply'}
                  className={cn(
                    'ml-auto inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium transition-colors',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                    isHidden
                      ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                      : 'border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10',
                  )}
                >
                  {isHidden ? (
                    <>
                      <Eye className="h-3 w-3" aria-hidden />
                      Restore
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3 w-3" aria-hidden />
                      Hide
                    </>
                  )}
                </button>
              )}
            </div>
          </>
        )}

        {replying && !isHidden && (
          <div className="mt-3">
            <ReplyComposer
              postId={postId}
              parentReplyId={reply.id}
              autoFocus
              onDone={() => setReplying(false)}
              placeholder={`Reply to ${reply.authorDisplayName}…`}
            />
          </div>
        )}

        {childReplies && childReplies.length > 0 && (
          <div className="mt-3 ml-2 border-l-2 border-border pl-4">
            {childReplies.map((child) => (
              <ReplyCard
                key={child.id}
                reply={child}
                postId={postId}
                opAuthorId={opAuthorId}
                locked={locked}
                depth={2}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
