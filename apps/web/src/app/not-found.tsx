import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound(): JSX.Element {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-start justify-center gap-4 px-6">
      <h1 className="text-xl font-semibold">Not found.</h1>
      <p className="text-sm text-muted-foreground">
        The page you&rsquo;re looking for doesn&rsquo;t exist in this community&rsquo;s forum.
      </p>
      <Button asChild>
        <Link href="/">Back to feed</Link>
      </Button>
    </div>
  );
}
