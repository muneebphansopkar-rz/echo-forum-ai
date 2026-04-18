import { EyeOff } from 'lucide-react';

export function HiddenReplyPlaceholder(): JSX.Element {
  return (
    <div className="rounded-md border border-border bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
      <span className="mb-1 inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[11px] font-medium text-destructive">
        <EyeOff className="h-3 w-3" aria-hidden />
        Hidden by moderator
      </span>
      <p className="mt-1">
        This content has been hidden. Original visible to author only.
      </p>
    </div>
  );
}
