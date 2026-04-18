import { z } from 'zod';

/**
 * Shared primitives for the SKEP Forum API contract.
 *
 * These schemas mirror the backend DTOs and are the authoritative source
 * the frontend reads/writes. When the backend changes a DTO, update the
 * matching schema here in the same PR.
 */

// ── Envelope ──────────────────────────────────────────────────────────────
export const envelopeMetaSchema = z.object({
  requestId: z.string(),
  timestamp: z.string(),
});

export const errorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

export const successEnvelopeSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    success: z.literal(true),
    data,
    meta: envelopeMetaSchema,
  });

export const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: errorBodySchema,
  meta: envelopeMetaSchema,
});

export type EnvelopeMeta = z.infer<typeof envelopeMetaSchema>;
export type ApiErrorBody = z.infer<typeof errorBodySchema>;

// ── Pagination ────────────────────────────────────────────────────────────
export const paginatedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });

// ── Tag ───────────────────────────────────────────────────────────────────
export const tagSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  label: z.string(),
  color: z.string(),
  isSystem: z.boolean(),
  postCount: z.number().int().nonnegative().default(0),
});
export type Tag = z.infer<typeof tagSchema>;

// ── Post summary / detail ─────────────────────────────────────────────────
export const postSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  excerpt: z.string(),
  authorId: z.string(),
  authorDisplayName: z.string(),
  tags: z.array(tagSchema),
  upvoteCount: z.number().int().nonnegative(),
  replyCount: z.number().int().nonnegative(),
  isPinned: z.boolean(),
  isLocked: z.boolean(),
  isViewerUpvoted: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PostSummary = z.infer<typeof postSummarySchema>;

export const postDetailSchema = postSummarySchema.extend({
  body: z.string(),
  editedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
});
export type PostDetail = z.infer<typeof postDetailSchema>;

// ── Reply ─────────────────────────────────────────────────────────────────
export const replySchema = z.object({
  id: z.string().uuid(),
  postId: z.string().uuid(),
  parentReplyId: z.string().uuid().nullable(),
  depth: z.union([z.literal(1), z.literal(2)]),
  authorId: z.string(),
  authorDisplayName: z.string(),
  body: z.string(),
  upvoteCount: z.number().int().nonnegative(),
  isViewerUpvoted: z.boolean(),
  hiddenAt: z.string().nullable(),
  hiddenBy: z.string().nullable(),
  createdAt: z.string(),
  deletedAt: z.string().nullable(),
});
export type Reply = z.infer<typeof replySchema>;

// ── Moderation queue item ─────────────────────────────────────────────────
export const queueBucketSchema = z.enum([
  'hidden_replies',
  'pinned',
  'locked',
  'tag_overrides',
]);
export type QueueBucket = z.infer<typeof queueBucketSchema>;

export const queueItemSchema = z.object({
  id: z.string().uuid(),
  bucket: queueBucketSchema,
  targetType: z.enum(['post', 'reply']),
  targetId: z.string().uuid(),
  title: z.string(),
  subtitle: z.string(),
  actorUserId: z.string().nullable(),
  reason: z.string().nullable(),
  createdAt: z.string(),
});
export type QueueItem = z.infer<typeof queueItemSchema>;

// ── Helpers ──────────────────────────────────────────────────────────────
export const cursorQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
