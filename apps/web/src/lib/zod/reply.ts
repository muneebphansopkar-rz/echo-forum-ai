import { z } from 'zod';

export const createReplySchema = z.object({
  body: z.string().min(1).max(10_000),
  parentReplyId: z.string().uuid().nullable().optional(),
});
export type CreateReplyInput = z.infer<typeof createReplySchema>;

export const replySortSchema = z.enum(['top', 'new']);
export type ReplySort = z.infer<typeof replySortSchema>;

export const listRepliesQuerySchema = z.object({
  sort: replySortSchema.default('top'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
export type ListRepliesQuery = z.infer<typeof listRepliesQuerySchema>;
