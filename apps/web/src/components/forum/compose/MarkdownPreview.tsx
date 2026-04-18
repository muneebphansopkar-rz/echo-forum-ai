'use client';

import { Markdown } from '@/components/forum/thread/Markdown';
import { cn } from '@/lib/utils';

/**
 * Thin wrapper that reuses Stream F1's shared Markdown renderer so we
 * don't ship two inconsistent parsers. Until react-markdown + DOMPurify
 * land, F1's renderer handles our toolbar's output (bold, italic, inline
 * code, paragraphs). Headings, quotes and lists degrade to styled
 * paragraphs, which is acceptable for MVP.
 */
export function MarkdownPreview({
  source,
  className,
}: {
  source: string;
  className?: string;
}): JSX.Element {
  const trimmed = source.trim();
  if (!trimmed) {
    return (
      <div
        className={cn(
          'rounded-lg border border-border-strong bg-page-bg/50 px-5 py-4',
          'text-sm text-text-muted min-h-[340px]',
          className,
        )}
      >
        Start typing on the Write tab — your preview will render here exactly
        as members will see it.
      </div>
    );
  }
  return (
    <div
      className={cn(
        'min-h-[340px] rounded-lg border border-border-strong bg-page-bg/40 px-5 py-4',
        'text-sm leading-[1.8] text-text-secondary',
        className,
      )}
    >
      <Markdown source={source} />
    </div>
  );
}
