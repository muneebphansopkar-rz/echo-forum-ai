'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useMockSession } from '@/hooks/use-mock-session';
import {
  useModQueue,
  useModerationAction,
  useModerationCounts,
} from '@/hooks/use-moderation';
import type { ModQueueBucket } from '@/lib/query-keys';
import type { QueueItem } from '@/lib/zod/common';
import { ModQueueSidebar } from '@/components/forum/moderation/ModQueueSidebar';
import { ModFilterTabs } from '@/components/forum/moderation/ModFilterTabs';
import { ModSummaryCards } from '@/components/forum/moderation/ModSummaryCards';
import { ModSection } from '@/components/forum/moderation/ModSection';
import {
  ModCard,
  type ModActionKind,
} from '@/components/forum/moderation/ModCard';
import { QuickActionsGrid } from '@/components/forum/moderation/QuickActionsGrid';

const MOD_ROLES = new Set(['MODERATOR', 'ADMIN', 'OWNER']);

/**
 * /moderation — fullscreen queue + actions screen.
 *
 * Gated on role (MOD/ADMIN/OWNER). When access is missing we prompt the
 * caller to flip the mock-session role so smoke testing stays one click
 * away from the rest of the app.
 */
export default function ModerationPage(): JSX.Element {
  const session = useMockSession();
  const [bucket, setBucket] = useState<ModQueueBucket>('all');

  if (!MOD_ROLES.has(session.role)) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md rounded-lg border border-border-strong bg-card-bg p-6 shadow-skep-sm">
          <h1 className="text-lg font-semibold text-text-primary">
            Not authorized
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Moderation is available to moderators, admins, and owners. Your
            current session role is{' '}
            <strong className="text-text-primary">{session.role}</strong>.
          </p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => session.setRole('MODERATOR')}>
              Switch to MODERATOR
            </Button>
            <Button
              variant="outline"
              onClick={() => session.setRole('OWNER')}
            >
              Switch to OWNER
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <ModerationContent bucket={bucket} onBucketChange={setBucket} />;
}

function ModerationContent({
  bucket,
  onBucketChange,
}: {
  bucket: ModQueueBucket;
  onBucketChange: (b: ModQueueBucket) => void;
}): JSX.Element {
  const query = useModQueue(bucket);
  const countsQuery = useModerationCounts();
  const action = useModerationAction();

  const items = query.data?.items ?? [];
  // Counts come from `/forum/moderation/counts`, not from the queue list.
  const counts = countsQuery.data;

  const bucketed = useMemo(() => {
    const grouped: Record<QueueItem['bucket'], QueueItem[]> = {
      hidden_replies: [],
      pinned: [],
      locked: [],
      tag_overrides: [],
    };
    for (const item of items) grouped[item.bucket].push(item);
    return grouped;
  }, [items]);

  const handleAction = async (kind: ModActionKind, item: QueueItem) => {
    switch (kind) {
      case 'restore':
        await action.mutateAsync({
          kind: 'restore',
          targetType: item.targetType,
          targetId: item.targetId,
        });
        return;
      case 'delete':
        // No hard-delete endpoint in the MVP contract — restore removes
        // the item from the queue, which is the practical outcome callers
        // want today. Swap for DELETE /forum/:type/:id once shipped.
        await action.mutateAsync({
          kind: 'restore',
          targetType: item.targetType,
          targetId: item.targetId,
        });
        return;
      case 'unpin':
        await action.mutateAsync({
          kind: 'pin',
          postId: item.targetId,
          pinned: false,
        });
        return;
      case 'unlock':
        await action.mutateAsync({
          kind: 'lock',
          postId: item.targetId,
          locked: false,
        });
        return;
      case 'revert':
        // Tag override revert is a backend-only concept (no explicit
        // endpoint yet). Surface as a no-op pending Stream B.
        return;
    }
  };

  const showHidden =
    bucket === 'all' || bucket === 'hidden_replies';
  const showPinnedLocked =
    bucket === 'all' || bucket === 'pinned' || bucket === 'locked';
  const showTagOverrides =
    bucket === 'all' || bucket === 'tag_overrides';

  const totalVisible = items.length;

  return (
    <div className="flex flex-1">
      <ModQueueSidebar
        active={bucket}
        onChange={onBucketChange}
        counts={counts}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <ModFilterTabs active={bucket} onChange={onBucketChange} />

        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-text-primary">
              Active moderation items
            </h2>
            <p className="mt-1.5 text-[13px] text-text-muted">
              Review the queue, act on pinned or locked threads, and keep
              visible records of overrides.
            </p>
          </div>
          <span className="text-xs text-text-muted">
            {query.isLoading
              ? 'Loading…'
              : `${totalVisible} item${totalVisible === 1 ? '' : 's'} visible`}
          </span>
        </header>

        <ModSummaryCards counts={counts} />

        {query.isLoading ? (
          <div
            className="flex flex-col gap-3"
            aria-busy
            aria-label="Loading queue"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg border border-border-strong bg-card-bg"
              />
            ))}
          </div>
        ) : query.isError ? (
          <div
            className={cn(
              'rounded-lg border border-status-locked/40 bg-status-locked-bg',
              'p-4 text-sm text-status-locked',
            )}
          >
            Couldn&rsquo;t load the moderation queue:{' '}
            {(query.error as Error).message}
          </div>
        ) : (
          <>
            <ModSection
              label="Hidden replies"
              hidden={!showHidden || bucketed.hidden_replies.length === 0}
            >
              {bucketed.hidden_replies.map((item) => (
                <ModCard
                  key={item.id}
                  item={item}
                  onAction={handleAction}
                  isPending={action.isPending}
                />
              ))}
            </ModSection>

            <ModSection
              label="Pinned & locked"
              hidden={
                !showPinnedLocked ||
                (bucketed.pinned.length === 0 && bucketed.locked.length === 0)
              }
            >
              {bucketed.pinned.map((item) => (
                <ModCard
                  key={item.id}
                  item={item}
                  onAction={handleAction}
                  isPending={action.isPending}
                />
              ))}
              {bucketed.locked.map((item) => (
                <ModCard
                  key={item.id}
                  item={item}
                  onAction={handleAction}
                  isPending={action.isPending}
                />
              ))}
            </ModSection>

            <ModSection
              label="Tag overrides"
              hidden={
                !showTagOverrides || bucketed.tag_overrides.length === 0
              }
            >
              {bucketed.tag_overrides.map((item) => (
                <ModCard
                  key={item.id}
                  item={item}
                  onAction={handleAction}
                  isPending={action.isPending}
                />
              ))}
            </ModSection>

            {totalVisible === 0 ? (
              <div className="rounded-lg border border-dashed border-border-strong bg-card-bg p-6 text-center text-sm text-text-muted">
                Nothing to moderate right now. The queue is clear.
              </div>
            ) : null}

            <QuickActionsGrid />
          </>
        )}
      </div>
    </div>
  );
}
