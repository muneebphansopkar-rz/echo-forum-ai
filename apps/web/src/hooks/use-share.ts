'use client';

import { useCallback, useState } from 'react';

/**
 * Lightweight share helper.
 *
 *   • On browsers that expose `navigator.share` (mobile Safari, mobile
 *     Chrome, desktop Chrome on secure origins) we open the native share
 *     sheet.
 *   • Everywhere else we fall back to copying the URL to the clipboard
 *     and flashing a transient "copied" state so callers can show a
 *     confirmation pill without tracking timers themselves.
 */

export interface ShareInput {
  title: string;
  text?: string;
  pathname: string;
}

export interface UseShare {
  state: 'idle' | 'copied';
  share: (input: ShareInput) => Promise<void>;
}

const RESET_DELAY_MS = 1_500;

export function useShare(): UseShare {
  const [state, setState] = useState<'idle' | 'copied'>('idle');

  const share = useCallback(async (input: ShareInput) => {
    const url =
      typeof window === 'undefined'
        ? input.pathname
        : new URL(input.pathname, window.location.origin).toString();

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: input.title, text: input.text, url });
        return;
      } catch {
        /* user dismissed the sheet — drop through to clipboard */
      }
    }

    try {
      await navigator.clipboard?.writeText(url);
      setState('copied');
      window.setTimeout(() => setState('idle'), RESET_DELAY_MS);
    } catch {
      /* clipboard failure is non-fatal (HTTP origins, old browsers) */
    }
  }, []);

  return { state, share };
}
