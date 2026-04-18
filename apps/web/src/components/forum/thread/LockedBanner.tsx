import { Lock } from 'lucide-react';

export function LockedBanner(): JSX.Element {
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
    >
      <Lock className="h-3.5 w-3.5" aria-hidden />
      This thread is locked. New replies are disabled.
    </div>
  );
}
