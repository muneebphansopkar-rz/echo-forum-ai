import { Feed } from '@/components/forum/feed';
import type { TopWindow } from '@/lib/query-keys';

interface PageProps {
  searchParams: { w?: string; tag?: string };
}

function coerceWindow(value: string | undefined): TopWindow {
  if (value === 'week' || value === 'all') return value;
  return 'today';
}

export default function TopFeedPage({ searchParams }: PageProps): JSX.Element {
  return (
    <Feed
      sort="top"
      window={coerceWindow(searchParams.w)}
      tag={searchParams.tag}
    />
  );
}
