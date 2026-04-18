/** Matches `replySchema` in apps/web/src/lib/zod/common.ts. */
export interface ReplyDto {
  id: string;
  postId: string;
  parentReplyId: string | null;
  depth: 1 | 2;
  authorId: string;
  authorDisplayName: string;
  body: string;
  upvoteCount: number;
  isViewerUpvoted: boolean;
  hiddenAt: string | null;
  hiddenBy: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface ReplyListResponse {
  items: ReplyDto[];
  nextCursor: string | null;
}
