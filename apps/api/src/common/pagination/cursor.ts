/**
 * Cursor pagination helpers. All list endpoints return:
 *   { items: T[], nextCursor: string | null }
 *
 * Cursor encodes { id, createdAt } (or the sort-key tuple) as base64 JSON.
 * Default page size 20, max 50 — see apps/api/CONTEXT.md.
 */

export interface CursorPayload {
  id: string;
  createdAt: string;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as Partial<CursorPayload>;
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.createdAt !== 'string'
    ) {
      return null;
    }
    return { id: parsed.id, createdAt: parsed.createdAt };
  } catch {
    return null;
  }
}

export function clampLimit(limit: number | undefined): number {
  if (!limit || limit <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(limit, MAX_PAGE_SIZE);
}
