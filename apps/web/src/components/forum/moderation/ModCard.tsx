'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { QueueItem } from '@/lib/zod/common';

export type ModActionKind = 'restore' | 'delete' | 'unpin' | 'unlock' | 'revert';

interface ModCardProps {
  item: QueueItem;
  onAction: (kind: ModActionKind, item: QueueItem) => void;
  isPending?: boolean;
}

const BUCKET_TO_ACTIONS: Record<QueueItem['bucket'], ModActionKind[]> = {
  hidden_replies: ['restore', 'delete'],
  pinned: ['unpin'],
  locked: ['unlock'],
  tag_overrides: ['revert'],
};

const BUCKET_TO_INDICATOR: Record<QueueItem['bucket'], string> = {
  hidden_replies: 'bg-status-locked',
  pinned: 'bg-status-pinned',
  locked: 'bg-status-locked',
  tag_overrides: 'bg-tag-announcements',
};

const ACTION_LABEL: Record<ModActionKind, string> = {
  restore: 'Restore',
  delete: 'Delete',
  unpin: 'Unpin',
  unlock: 'Unlock',
  revert: 'Revert',
};

function ActionButton({
  kind,
  onClick,
  disabled,
  children,
}: {
  kind: ModActionKind;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}): JSX.Element {
  const variant: 'outline' | 'destructive' =
    kind === 'delete' ? 'destructive' : 'outline';
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      onClick={onClick}
      disabled={disabled}
      className="h-7 px-2.5 text-[11px]"
    >
      {children}
    </Button>
  );
}

export function ModCard({ item, onAction, isPending }: ModCardProps): JSX.Element {
  const actions = BUCKET_TO_ACTIONS[item.bucket];
  return (
    <div className="flex items-center gap-2.5 border-b border-border-light px-3.5 py-3 last:border-b-0">
      <span
        aria-hidden
        className={cn('h-2 w-2 flex-shrink-0 rounded-full', BUCKET_TO_INDICATOR[item.bucket])}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] text-text-primary">{item.title}</div>
        <div className="mt-0.5 text-[11px] text-text-muted">{item.subtitle}</div>
      </div>
      <div className="flex flex-shrink-0 gap-1.5">
        {actions.map((kind) => (
          <ActionButton
            key={kind}
            kind={kind}
            onClick={() => onAction(kind, item)}
            disabled={isPending}
          >
            {ACTION_LABEL[kind]}
          </ActionButton>
        ))}
      </div>
    </div>
  );
}
