'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-start justify-center gap-4 px-6">
      <h1 className="text-xl font-semibold">Something went wrong.</h1>
      <p className="text-sm text-muted-foreground">
        {error.message || 'Unexpected error. Try again, or head back to the feed.'}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
