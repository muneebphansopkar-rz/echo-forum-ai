import type { ReactNode } from 'react';
import { ModTopBar } from '@/components/chrome/ModTopBar';

/**
 * Fullscreen moderation shell — a single dark back-bar and nothing else.
 * Intentionally renders outside the (forum) route group so it does NOT
 * inherit the RZ Team / AI Mastery sidebar.
 */
export default function ModerationLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-page-bg">
      <ModTopBar context="Moderation" backHref="/" />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
