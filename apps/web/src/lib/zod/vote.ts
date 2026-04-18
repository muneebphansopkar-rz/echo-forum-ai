import { z } from 'zod';

export const voteTargetTypeSchema = z.enum(['post', 'reply']);
export type VoteTargetType = z.infer<typeof voteTargetTypeSchema>;

export const toggleVoteSchema = z.object({
  targetType: voteTargetTypeSchema,
  targetId: z.string().uuid(),
});
export type ToggleVoteInput = z.infer<typeof toggleVoteSchema>;

export const toggleVoteResultSchema = z.object({
  upvoted: z.boolean(),
  upvoteCount: z.number().int().nonnegative(),
});
export type ToggleVoteResult = z.infer<typeof toggleVoteResultSchema>;
