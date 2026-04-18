import type { TagResponse } from '../../tags/dto/tag.response';

/** Matches `postSummarySchema` in apps/web/src/lib/zod/common.ts. */
export interface PostSummaryDto {
  id: string;
  title: string;
  excerpt: string;
  authorId: string;
  authorDisplayName: string;
  tags: TagResponse[];
  upvoteCount: number;
  replyCount: number;
  isPinned: boolean;
  isLocked: boolean;
  isViewerUpvoted: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Matches `postDetailSchema` in apps/web/src/lib/zod/common.ts (summary + body + timestamps). */
export interface PostDetailDto extends PostSummaryDto {
  body: string;
  editedAt: string | null;
  deletedAt: string | null;
}

export interface PostListResponse {
  items: PostSummaryDto[];
  nextCursor: string | null;
}
