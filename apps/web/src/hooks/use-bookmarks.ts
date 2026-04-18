'use client';

import { useEffect, useSyncExternalStore } from 'react';
import type { PostSummary } from '@/lib/zod/common';

/**
 * Client-side bookmarks ("My bookmark").
 *
 * Persists a map of `PostSummary` snapshots keyed by post id in
 * localStorage, scoped by community so switching communities doesn't leak
 * saved items. A tiny pub/sub lets any mounted PostCard + the bookmarks
 * page stay in sync without adding a store dependency.
 *
 * When the backend grows a real `forum_bookmarks` table the hook's public
 * surface (`toggle`, `isSaved`, `list`) stays the same — only the storage
 * adapter swaps.
 */

const STORAGE_PREFIX = 'skep.forum.bookmarks';

type BookmarkMap = Record<string, PostSummary>;

function storageKey(): string {
  if (typeof window === 'undefined') return `${STORAGE_PREFIX}.default`;
  const community =
    window.localStorage.getItem('skep.mock.community') ??
    process.env.NEXT_PUBLIC_MOCK_COMMUNITY_CODE ??
    'default';
  return `${STORAGE_PREFIX}.${community}`;
}

function readAll(): BookmarkMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey());
    if (!raw) return {};
    const parsed = JSON.parse(raw) as BookmarkMap;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: BookmarkMap): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(), JSON.stringify(map));
}

// ── Pub/sub so multiple subscribers re-render in lockstep ─────────────────
const listeners = new Set<() => void>();
function notify(): void {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let cachedSnapshot: BookmarkMap | null = null;
function getSnapshot(): BookmarkMap {
  if (cachedSnapshot === null) cachedSnapshot = readAll();
  return cachedSnapshot;
}
function getServerSnapshot(): BookmarkMap {
  return {};
}

function mutate(fn: (prev: BookmarkMap) => BookmarkMap): void {
  const next = fn(cachedSnapshot ?? readAll());
  cachedSnapshot = next;
  writeAll(next);
  notify();
}

export interface UseBookmarks {
  /** Ordered newest-first list of saved posts. */
  items: PostSummary[];
  isSaved: (postId: string) => boolean;
  /** Toggle — adds when absent, removes when present. */
  toggle: (post: PostSummary) => void;
  remove: (postId: string) => void;
  count: number;
}

export function useBookmarks(): UseBookmarks {
  const map = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Cross-tab sync: react to other tabs' `storage` events.
  useEffect(() => {
    function onStorage(e: StorageEvent): void {
      if (!e.key || !e.key.startsWith(STORAGE_PREFIX)) return;
      cachedSnapshot = readAll();
      notify();
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const items = Object.values(map).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );

  return {
    items,
    count: items.length,
    isSaved: (postId) => Boolean(map[postId]),
    toggle: (post) =>
      mutate((prev) => {
        if (prev[post.id]) {
          const { [post.id]: _dropped, ...rest } = prev;
          return rest;
        }
        return { ...prev, [post.id]: post };
      }),
    remove: (postId) =>
      mutate((prev) => {
        if (!prev[postId]) return prev;
        const { [postId]: _dropped, ...rest } = prev;
        return rest;
      }),
  };
}
