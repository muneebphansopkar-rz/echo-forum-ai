import { Feed } from '@/components/forum/feed';

interface PageProps {
  searchParams: { tag?: string };
}

export default function NewFeedPage({ searchParams }: PageProps): JSX.Element {
  return <Feed sort="new" tag={searchParams.tag} />;
}
