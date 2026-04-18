import { z } from 'zod';

/**
 * Request / query schemas for the posts resource.
 * Response shapes live in ./common.ts.
 */

// ── Create / update ───────────────────────────────────────────────────────
export const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10_000),
  tagIds: z.array(z.string().uuid()).min(1).max(3),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = createPostSchema.partial();
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

// ── Feed query ────────────────────────────────────────────────────────────
export const feedSortSchema = z.enum(['hot', 'new', 'top']);
export type FeedSort = z.infer<typeof feedSortSchema>;

export const topWindowSchema = z.enum(['today', 'week', 'all']);
export type TopWindow = z.infer<typeof topWindowSchema>;

export const feedQuerySchema = z.object({
  sort: feedSortSchema.default('hot'),
  window: topWindowSchema.optional(),
  tag: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
export type FeedQuery = z.infer<typeof feedQuerySchema>;
