import { IsEnum, IsUUID } from 'class-validator';

export const VOTE_TARGET_VALUES = ['post', 'reply'] as const;
export type VoteTargetType = (typeof VOTE_TARGET_VALUES)[number];

/** Matches `toggleVoteSchema` in apps/web/src/lib/zod/vote.ts. */
export class ToggleVoteDto {
  @IsEnum(VOTE_TARGET_VALUES)
  targetType!: VoteTargetType;

  @IsUUID('4')
  targetId!: string;
}

/** Matches `toggleVoteResultSchema`. */
export interface ToggleVoteResult {
  upvoted: boolean;
  upvoteCount: number;
}
