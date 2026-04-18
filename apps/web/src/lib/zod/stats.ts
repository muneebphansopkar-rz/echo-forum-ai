import { z } from 'zod';

export const communityTotalsSchema = z.object({
  posts: z.number().int().nonnegative(),
  replies: z.number().int().nonnegative(),
  upvotes: z.number().int().nonnegative(),
  members: z.number().int().nonnegative(),
});
export type CommunityTotals = z.infer<typeof communityTotalsSchema>;

export const topContributorSchema = z.object({
  platformUserId: z.string(),
  displayName: z.string(),
  initials: z.string(),
  upvotesToday: z.number().int().nonnegative(),
});
export type TopContributor = z.infer<typeof topContributorSchema>;

export const statsResponseSchema = z.object({
  totals: communityTotalsSchema,
  topContributors: z.array(topContributorSchema),
});
export type StatsResponse = z.infer<typeof statsResponseSchema>;
