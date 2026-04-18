import { displayNameFor } from '../common/display-name';
import type { TagResponse } from '../tags/dto/tag.response';
import type { PostDetailDto, PostSummaryDto } from './dto/post.response';
import type { PostRow, PostRowWithExtras } from './posts.repository';

export function toPostSummary(
  row: PostRowWithExtras,
  tags: TagResponse[],
): PostSummaryDto {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt ?? (row.body ? row.body.slice(0, 280) : ''),
    authorId: row.author_user_id,
    authorDisplayName: displayNameFor(row.author_user_id),
    tags,
    upvoteCount: row.upvote_count,
    replyCount: row.reply_count,
    isPinned: row.is_pinned,
    isLocked: row.is_locked,
    isViewerUpvoted: Boolean(row.viewer_upvoted),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toPostDetail(
  row: PostRowWithExtras,
  tags: TagResponse[],
): PostDetailDto {
  return {
    ...toPostSummary(row, tags),
    body: row.body,
    editedAt:
      row.updated_at.getTime() !== row.created_at.getTime()
        ? row.updated_at.toISOString()
        : null,
    deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
  };
}

export function normalizeRow(
  row: PostRow & { viewer_upvoted?: unknown },
): PostRowWithExtras {
  return {
    ...row,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
    deleted_at: row.deleted_at ? new Date(row.deleted_at) : null,
    hidden_at: row.hidden_at ? new Date(row.hidden_at) : null,
    viewer_upvoted: Boolean(row.viewer_upvoted),
  };
}
