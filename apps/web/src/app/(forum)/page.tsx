import { Feed } from '@/components/forum/feed';

interface PageProps {
  searchParams: { tag?: string };
}

export default function HotFeedPage({ searchParams }: PageProps): JSX.Element {
  return <Feed sort="hot" tag={searchParams.tag} />;
}
