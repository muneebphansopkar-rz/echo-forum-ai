'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCreateReply } from '@/hooks/use-posts';

interface ReplyComposerProps {
  postId: string;
  parentReplyId?: string | null;
  autoFocus?: boolean;
  placeholder?: string;
  onDone?: () => void;
}

const MIN_LENGTH = 1;
const MAX_LENGTH = 10_000;

export function ReplyComposer({
  postId,
  parentReplyId,
  autoFocus,
  placeholder = 'Write a reply in Markdown…',
  onDone,
}: ReplyComposerProps): JSX.Element {
  const [body, setBody] = useState('');
  const createReply = useCreateReply();

  const trimmed = body.trim();
  const canSubmit =
    trimmed.length >= MIN_LENGTH &&
    trimmed.length <= MAX_LENGTH &&
    !createReply.isPending;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    createReply.mutate(
      { postId, body: trimmed, parentReplyId: parentReplyId ?? null },
      {
        onSuccess: () => {
          setBody('');
          onDone?.();
        },
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-card p-3 shadow-sm"
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={4}
        maxLength={MAX_LENGTH}
        className="block w-full resize-y rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm leading-relaxed text-foreground outline-none transition-colors focus:border-primary focus:bg-card"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-[11px] text-muted-foreground">
          Markdown supported · {trimmed.length}/{MAX_LENGTH}
        </span>
        <div className="flex items-center gap-2">
          {onDone && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onDone}
              disabled={createReply.isPending}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={!canSubmit}>
            {createReply.isPending ? 'Posting…' : 'Post reply'}
          </Button>
        </div>
      </div>
      {createReply.isError && (
        <p className="mt-2 text-xs text-destructive">
          {(createReply.error as Error).message}
        </p>
      )}
    </form>
  );
}
