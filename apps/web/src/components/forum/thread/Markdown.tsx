'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

/**
 * Single chokepoint for rendering user-authored bodies (posts, replies) and
 * sanitized highlight snippets (search results).
 *
 * Markdown rendering: `react-markdown` + `remark-gfm`. Raw HTML in the source
 * is disabled by react-markdown's defaults — safe without a sanitizer.
 *
 * Search highlight HTML (`ts_headline` output) is a narrow, known shape —
 * we escape everything and then re-open the three tag types Postgres emits.
 * Because this is the only place `dangerouslySetInnerHTML` is used, swapping
 * in a real sanitizer later stays a one-file change.
 */

const SAFE_HIGHLIGHT_TAGS = new Set(['mark', 'em', 'strong', 'b', 'i']);

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function rehydrateSafeTags(escaped: string): string {
  return escaped.replace(
    /&lt;(\/?)([a-zA-Z]+)&gt;/g,
    (match, slash: string, tag: string) => {
      if (SAFE_HIGHLIGHT_TAGS.has(tag.toLowerCase())) {
        return `<${slash}${tag.toLowerCase()}>`;
      }
      return match;
    },
  );
}

/** Render an already-HTML snippet (e.g. `ts_headline` output from search). */
export function InlineHighlight({
  html,
  className,
}: {
  html: string | null | undefined;
  className?: string;
}): JSX.Element | null {
  if (!html) return null;
  const sanitized = rehydrateSafeTags(escapeHtml(html)).replace(
    /<mark>/g,
    '<mark class="rounded-sm bg-yellow-200/70 px-0.5 text-foreground">',
  );
  return (
    <span
      className={cn('', className)}
      // Safe: every angle bracket is escaped; only <mark>/<em>/<strong> are
      // re-opened via the allow-list above.
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

export interface MarkdownProps {
  source: string;
  className?: string;
}

export function Markdown({ source, className }: MarkdownProps): JSX.Element {
  return (
    <div
      className={cn(
        'space-y-3 text-sm leading-relaxed text-muted-foreground',
        '[&_strong]:text-foreground [&_code]:text-foreground',
        '[&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_h1]:mt-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-foreground',
        '[&_h2]:mt-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground',
        '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic',
        '[&_code]:rounded [&_code]:bg-secondary [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]',
        '[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-secondary [&_pre]:p-3 [&_pre]:text-xs',
        '[&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </div>
  );
}
