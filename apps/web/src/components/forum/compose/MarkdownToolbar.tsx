'use client';

import { cn } from '@/lib/utils';

export type MarkdownCommand =
  | 'bold'
  | 'italic'
  | 'h2'
  | 'quote'
  | 'ul'
  | 'code'
  | 'mention';

interface MarkdownToolbarProps {
  onCommand: (cmd: MarkdownCommand) => void;
  disabled?: boolean;
  className?: string;
}

const BUTTONS: Array<{ cmd: MarkdownCommand; label: React.ReactNode; title: string }> = [
  { cmd: 'bold', label: <strong>B</strong>, title: 'Bold (wrap selection in **)' },
  { cmd: 'italic', label: <em>I</em>, title: 'Italic (wrap selection in *)' },
  { cmd: 'h2', label: 'H2', title: 'Heading 2' },
  { cmd: 'quote', label: '"', title: 'Blockquote' },
  { cmd: 'ul', label: '• List', title: 'Bulleted list' },
  { cmd: 'code', label: '`code`', title: 'Inline code' },
  { cmd: 'mention', label: '@', title: 'Mention a member' },
];

export function MarkdownToolbar({
  onCommand,
  disabled,
  className,
}: MarkdownToolbarProps): JSX.Element {
  return (
    <div
      role="toolbar"
      aria-label="Markdown formatting"
      className={cn('mb-3 flex flex-wrap gap-2', className)}
    >
      {BUTTONS.map((b) => (
        <button
          key={b.cmd}
          type="button"
          disabled={disabled}
          onClick={() => onCommand(b.cmd)}
          title={b.title}
          className={cn(
            'rounded-md border border-border-strong bg-page-bg px-3 py-2',
            'text-xs text-text-secondary transition-colors hover:bg-border-light',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Pure helper that applies a markdown command to a textarea's current
 * selection. Returns the new `{ value, selectionStart, selectionEnd }`
 * pair so the caller can push it through React state in a controlled form.
 */
export function applyMarkdownCommand(
  cmd: MarkdownCommand,
  value: string,
  selectionStart: number,
  selectionEnd: number,
): { value: string; selectionStart: number; selectionEnd: number } {
  const before = value.slice(0, selectionStart);
  const selected = value.slice(selectionStart, selectionEnd);
  const after = value.slice(selectionEnd);

  const wrap = (pre: string, post = pre) => {
    const next = `${before}${pre}${selected || ''}${post}${after}`;
    const caret = selectionStart + pre.length + selected.length + post.length;
    return {
      value: next,
      selectionStart: selected ? selectionStart + pre.length : caret,
      selectionEnd: selected ? selectionEnd + pre.length : caret,
    };
  };

  const prependLine = (marker: string) => {
    const needsNewline = before.length > 0 && !before.endsWith('\n');
    const prefix = `${needsNewline ? '\n' : ''}${marker}`;
    const next = `${before}${prefix}${selected}${after}`;
    const caret = selectionStart + prefix.length + selected.length;
    return { value: next, selectionStart: caret, selectionEnd: caret };
  };

  switch (cmd) {
    case 'bold':
      return wrap('**');
    case 'italic':
      return wrap('*');
    case 'code':
      return wrap('`');
    case 'h2':
      return prependLine('## ');
    case 'quote':
      return prependLine('> ');
    case 'ul':
      return prependLine('- ');
    case 'mention': {
      const next = `${before}@${selected}${after}`;
      const caret = selectionStart + 1 + selected.length;
      return { value: next, selectionStart: caret, selectionEnd: caret };
    }
  }
}
