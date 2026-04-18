import { z } from 'zod';
import { queueBucketSchema } from './common';

export const togglePinSchema = z.object({ pinned: z.boolean() });
export type TogglePinInput = z.infer<typeof togglePinSchema>;

export const toggleLockSchema = z.object({ locked: z.boolean() });
export type ToggleLockInput = z.infer<typeof toggleLockSchema>;

export const hideContentSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type HideContentInput = z.infer<typeof hideContentSchema>;

export const modTargetTypeSchema = z.enum(['post', 'reply']);
export type ModTargetType = z.infer<typeof modTargetTypeSchema>;

export const queueQuerySchema = z.object({
  bucket: queueBucketSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
export type QueueQuery = z.infer<typeof queueQuerySchema>;

export const queueCountsSchema = z.object({
  all: z.number().int().nonnegative(),
  hidden_replies: z.number().int().nonnegative(),
  pinned: z.number().int().nonnegative(),
  locked: z.number().int().nonnegative(),
  tag_overrides: z.number().int().nonnegative(),
});
export type QueueCounts = z.infer<typeof queueCountsSchema>;
