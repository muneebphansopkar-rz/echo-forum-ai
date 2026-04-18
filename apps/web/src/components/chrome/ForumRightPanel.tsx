'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTags } from '@/hooks/use-tags';
import { useCommunityStats, type TopContributor } from '@/hooks/use-stats';
import { useMockSession } from '@/hooks/use-mock-session';
import { cn } from '@/lib/utils';

/**
 * Right-side companion panel — ported from `.forum-right` in
 * html/skep-forum-updated.html. All data comes from the backend:
 *   • Popular tags  → GET /forum/tags         (now includes postCount)
 *   • Top contributors + totals → GET /forum/stats
 *
 * Only rendered on the feed routes (/, /new, /top). Thread, composer,
 * search, and bookmarks pages get the full width of the content column
 * instead.
 */

const FEED_ROUTES = new Set(['/', '/new', '/top']);

const TAG_BADGE_STYLES: Record<string, string> = {
  launches: 'bg-tag-launches-bg text-tag-launches',
  feedback: 'bg-tag-feedback-bg text-tag-feedback',
  tools: 'bg-tag-tools-bg text-tag-tools',
  questions: 'bg-tag-questions-bg text-tag-questions',
  hiring: 'bg-tag-hiring-bg text-tag-hiring',
  announcements: 'bg-tag-announcements-bg text-tag-announcements',
};

const CONTRIBUTOR_AVATAR_STYLES = [
  'bg-brand-blue-light text-brand-blue',
  'bg-tag-announcements-bg text-tag-announcements',
  'bg-tag-tools-bg text-tag-tools',
  'bg-tag-feedback-bg text-tag-feedback',
] as const;

function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

export function ForumRightPanel({
  className,
}: {
  className?: string;
}): JSX.Element | null {
  const pathname = usePathname() ?? '/';
  if (!FEED_ROUTES.has(pathname)) return null;
  return <ForumRightPanelContent className={className} />;
}

function ForumRightPanelContent({
  className,
}: {
  className?: string;
}): JSX.Element {
  const { data: tags, isLoading: tagsLoading } = useTags();
  const { data: stats, isLoading: statsLoading } = useCommunityStats();
  const { role } = useMockSession();
  const isModerator = role !== 'MEMBER';

  const topContributors = stats?.topContributors ?? [];
  const totals = stats?.totals;

  // Only render tags that actually have posts — avoids visual clutter
  // when a community is young. `useTags` sorts by post_count DESC already.
  const popularTags = (tags ?? []).filter((t) => t.postCount > 0);

  return (
    <aside
      className={cn(
        // Pinned column: top:48px (navy bar) + 56px (content header) = 104px.
        // `h-[calc(...)]` gives it a bounded height so its own content can
        // scroll without dragging the rest of the page with it.
        'hidden w-[240px] flex-shrink-0 flex-col gap-6',
        'sticky top-[104px] self-start',
        'h-[calc(100vh-104px)] overflow-y-auto',
        'border-l border-border-strong bg-sidebar-bg px-4 py-5',
        'lg:flex',
        className,
      )}
      aria-label="Community highlights"
    >
      <section>
        <SectionTitle>Popular tags</SectionTitle>
        <ul className="mt-2 divide-y divide-border-light">
          {tagsLoading && <SkeletonRow count={3} />}
          {!tagsLoading && popularTags.length === 0 && (
            <li className="py-1.5 text-xs text-text-muted">
              No tags used yet.
            </li>
          )}
          {popularTags.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center justify-between py-1.5"
            >
              <Link
                href={`/?tag=${tag.slug}`}
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                  TAG_BADGE_STYLES[tag.slug] ?? 'bg-brand-blue-light text-brand-blue',
                )}
              >
                {tag.label}
              </Link>
              <span className="text-[11px] tabular-nums text-text-muted">
                {formatCount(tag.postCount)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle>Top contributors</SectionTitle>
        <ul className="mt-2 space-y-3">
          {statsLoading && <SkeletonRow count={3} />}
          {!statsLoading && topContributors.length === 0 && (
            <li className="text-xs text-text-muted">
              No activity today — check back later.
            </li>
          )}
          {topContributors.map((contributor, idx) => (
            <ContributorRow
              key={contributor.platformUserId}
              contributor={contributor}
              avatarStyle={
                CONTRIBUTOR_AVATAR_STYLES[idx % CONTRIBUTOR_AVATAR_STYLES.length]
              }
            />
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle>Community stats</SectionTitle>
        <dl className="mt-2 divide-y divide-border-light">
          <StatRow label="Posts" value={totals?.posts} loading={statsLoading} />
          <StatRow label="Replies" value={totals?.replies} loading={statsLoading} />
          <StatRow label="Members" value={totals?.members} loading={statsLoading} />
          <StatRow label="Upvotes" value={totals?.upvotes} loading={statsLoading} />
        </dl>
      </section>

      {isModerator && (
        <Button
          asChild
          size="sm"
          variant="outline"
          className="w-full justify-center gap-1.5"
        >
          <Link href="/moderation">
            <Shield className="h-3.5 w-3.5" aria-hidden />
            Moderation panel
          </Link>
        </Button>
      )}
    </aside>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
      {children}
    </h3>
  );
}

function ContributorRow({
  contributor,
  avatarStyle,
}: {
  contributor: TopContributor;
  avatarStyle: string;
}): JSX.Element {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={cn(
          'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
          avatarStyle,
        )}
        aria-hidden
      >
        {contributor.initials}
      </span>
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold text-text-primary">
          {contributor.displayName}
        </div>
        <div className="truncate text-[11px] text-text-muted">
          {contributor.upvotesToday} upvote
          {contributor.upvotesToday === 1 ? '' : 's'} today
        </div>
      </div>
    </li>
  );
}

function StatRow({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between py-1.5 text-xs">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="font-semibold tabular-nums text-text-primary">
        {loading || value === undefined ? '—' : formatCount(value)}
      </dd>
    </div>
  );
}

function SkeletonRow({ count }: { count: number }): JSX.Element {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="py-1.5" aria-busy="true">
          <div className="h-3 w-full animate-pulse rounded bg-secondary" />
        </li>
      ))}
    </>
  );
}
