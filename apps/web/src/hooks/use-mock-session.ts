'use client';

import { useEffect, useSyncExternalStore } from 'react';

/**
 * Mock session for the hackathon build.
 *
 * State lives in a module-level store so every `useMockSession()`
 * subscriber updates in lockstep — flipping the role in the TopBar
 * immediately flips the gating on PostCard / ReplyCard / right-panel
 * mod buttons without a page refresh.
 *
 * Each instance syncs via `useSyncExternalStore`. `localStorage` is used
 * only for persistence + cross-tab propagation (via the `storage` event).
 * Real NextAuth/Keycloak integration swaps this file — keep the return
 * shape stable.
 */
export interface MockSession {
  userId: string;
  platformUserId: string;
  communityId: string;
  role: 'MEMBER' | 'MODERATOR' | 'ADMIN' | 'OWNER';
  token: string | null;
  /** Switches which role the next minted token carries. */
  setRole: (role: MockSession['role']) => void;
}

type Role = MockSession['role'];

// ── Storage keys + helpers ────────────────────────────────────────────────
const STORAGE_TOKEN = 'skep.mock.jwt';
const STORAGE_TOKEN_EXPIRES = 'skep.mock.jwt.expires';
const STORAGE_ROLE = 'skep.mock.role';

const VALID_ROLES: readonly Role[] = ['MEMBER', 'MODERATOR', 'ADMIN', 'OWNER'];

function readLocal(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(key);
}
function writeLocal(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  if (value === null) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, value);
}
function parseRole(value: string | null): Role | null {
  if (!value) return null;
  return (VALID_ROLES as readonly string[]).includes(value)
    ? (value as Role)
    : null;
}
function envDefaultRole(): Role {
  return parseRole(process.env.NEXT_PUBLIC_MOCK_ROLE ?? null) ?? 'OWNER';
}

// ── Module-level shared state ─────────────────────────────────────────────
type Snapshot = { role: Role; token: string | null };

let currentSnapshot: Snapshot = { role: envDefaultRole(), token: null };
const serverSnapshot: Snapshot = { role: envDefaultRole(), token: null };

const listeners = new Set<() => void>();
function notify(): void {
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot(): Snapshot {
  return currentSnapshot;
}
function getServerSnapshot(): Snapshot {
  return serverSnapshot;
}
function setSnapshot(next: Partial<Snapshot>): void {
  const merged: Snapshot = { ...currentSnapshot, ...next };
  if (
    merged.role === currentSnapshot.role &&
    merged.token === currentSnapshot.token
  ) {
    return;
  }
  currentSnapshot = merged;
  notify();
}

// ── Token refresh — guarded against concurrent fetches per role ───────────
let inFlightRole: Role | null = null;

async function fetchTokenFor(role: Role): Promise<void> {
  if (typeof window === 'undefined') return;
  if (inFlightRole === role) return;
  inFlightRole = role;
  try {
    const res = await fetch(
      `/api/mock-session?role=${encodeURIComponent(role)}`,
      { method: 'GET', cache: 'no-store' },
    );
    if (!res.ok) return;
    const data = (await res.json()) as { token: string; expiresAt: string };
    // Only apply if the role we fetched for is still the active one —
    // rapid role-flips shouldn't install a stale token.
    if (currentSnapshot.role !== role) return;
    writeLocal(STORAGE_TOKEN, data.token);
    writeLocal(STORAGE_TOKEN_EXPIRES, data.expiresAt);
    writeLocal(STORAGE_ROLE, role);
    setSnapshot({ token: data.token });
  } finally {
    if (inFlightRole === role) inFlightRole = null;
  }
}

function hasFreshToken(): boolean {
  const expiry = readLocal(STORAGE_TOKEN_EXPIRES);
  const storedRole = parseRole(readLocal(STORAGE_ROLE));
  if (!expiry || storedRole !== currentSnapshot.role) return false;
  return new Date(expiry).getTime() > Date.now() + 60_000;
}

// ── One-time client-side bootstrap ───────────────────────────────────────
let bootstrapped = false;
function bootstrap(): void {
  if (bootstrapped || typeof window === 'undefined') return;
  bootstrapped = true;

  const storedRole = parseRole(readLocal(STORAGE_ROLE));
  const storedToken = readLocal(STORAGE_TOKEN);
  currentSnapshot = {
    role: storedRole ?? currentSnapshot.role,
    token: storedToken,
  };
  notify();

  if (!hasFreshToken()) {
    void fetchTokenFor(currentSnapshot.role);
  }

  // Cross-tab sync: react to role/token changes from other tabs.
  window.addEventListener('storage', (e) => {
    if (!e.key) return;
    if (e.key === STORAGE_ROLE) {
      const next = parseRole(e.newValue);
      if (next && next !== currentSnapshot.role) {
        setSnapshot({ role: next, token: null });
        void fetchTokenFor(next);
      }
    } else if (e.key === STORAGE_TOKEN) {
      setSnapshot({ token: e.newValue });
    }
  });
}

function setRoleGlobal(next: Role): void {
  if (next === currentSnapshot.role) return;
  // Optimistic: flip role + drop the old token right away so every
  // subscriber re-renders with the new permissions immediately; the
  // next API call waits for the fresh token below.
  writeLocal(STORAGE_ROLE, next);
  writeLocal(STORAGE_TOKEN, null);
  writeLocal(STORAGE_TOKEN_EXPIRES, null);
  setSnapshot({ role: next, token: null });
  void fetchTokenFor(next);
}

// ── Hook ─────────────────────────────────────────────────────────────────
export function useMockSession(): MockSession {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Bootstrap once on the client. Running it in an effect keeps the hook
  // SSR-safe — server renders with `envDefaultRole()`, client then swaps
  // to persisted values and every subscriber re-renders together.
  useEffect(() => {
    bootstrap();
  }, []);

  const platformUserId =
    process.env.NEXT_PUBLIC_MOCK_PLATFORM_USER_ID ?? 'USR61220651';
  const communityId =
    process.env.NEXT_PUBLIC_MOCK_COMMUNITY_CODE ?? 'COM96179941';

  return {
    userId: platformUserId,
    platformUserId,
    communityId,
    role: snapshot.role,
    token: snapshot.token,
    setRole: setRoleGlobal,
  };
}
