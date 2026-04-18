/**
 * Matches `tagSchema` in apps/web/src/lib/zod/common.ts.
 * `postCount` is the live count of non-deleted posts carrying the tag; it
 * comes from the `listAll` aggregation and is `0` on single-row lookups.
 */
export interface TagResponse {
  id: string;
  slug: string;
  label: string;
  color: string;
  isSystem: boolean;
  postCount: number;
}
