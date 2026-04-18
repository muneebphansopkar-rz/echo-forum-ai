import { Injectable } from '@nestjs/common';
import type { TenantContext } from '../../tenancy/tenant-query';
import type { ReplySort } from './dto/list-replies.query';

export interface ReplyRow {
  id: string;
  post_id: string;
  parent_reply_id: string | null;
  depth: number;
  author_user_id: string;
  body: string;
  upvote_count: number;
  hidden_at: Date | null;
  hidden_by_user_id: string | null;
  hide_reason: string | null;
  created_at: Date;
  deleted_at: Date | null;
}

export interface ReplyRowWithExtras extends ReplyRow {
  viewer_upvoted: boolean;
}

@Injectable()
export class RepliesRepository {
  async findByIdRaw(
    tenant: TenantContext,
    replyId: string,
  ): Promise<ReplyRow | null> {
    const rows = (await tenant.queryRunner.query(
      `SELECT * FROM forum_replies WHERE id = $1 LIMIT 1`,
      [replyId],
    )) as ReplyRow[];
    return rows[0] ?? null;
  }

  async insert(
    tenant: TenantContext,
    input: {
      postId: string;
      parentReplyId: string | null;
      depth: 1 | 2;
      authorUserId: string;
      body: string;
    },
  ): Promise<ReplyRow> {
    const rows = (await tenant.queryRunner.query(
      `INSERT INTO forum_replies (post_id, parent_reply_id, depth, author_user_id, body)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5)
         RETURNING *`,
      [
        input.postId,
        input.parentReplyId,
        input.depth,
        input.authorUserId,
        input.body,
      ],
    )) as ReplyRow[];
    return rows[0];
  }

  async softDelete(tenant: TenantContext, replyId: string): Promise<void> {
    await tenant.queryRunner.query(
      `UPDATE forum_replies SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`,
      [replyId],
    );
  }

  async setHidden(
    tenant: TenantContext,
    replyId: string,
    hidden: {
      hiddenAt: Date | null;
      hiddenByUserId: string | null;
      reason: string | null;
    },
  ): Promise<void> {
    await tenant.queryRunner.query(
      `UPDATE forum_replies
          SET hidden_at = $2,
              hidden_by_user_id = $3,
              hide_reason = $4
        WHERE id = $1 AND deleted_at IS NULL`,
      [replyId, hidden.hiddenAt, hidden.hiddenByUserId, hidden.reason],
    );
  }

  async listForPost(
    tenant: TenantContext,
    opts: {
      postId: string;
      sort: ReplySort;
      limit: number;
      cursor?: { id: string; createdAt: string; anchor?: number };
      viewerUserId: string;
    },
  ): Promise<ReplyRowWithExtras[]> {
    const params: unknown[] = [opts.viewerUserId, opts.postId];
    const conditions: string[] = ['r.post_id = $2::uuid', 'r.deleted_at IS NULL'];

    let cursorClause = '';
    if (opts.cursor) {
      if (opts.sort === 'top' && opts.cursor.anchor !== undefined) {
        params.push(opts.cursor.anchor);
        params.push(opts.cursor.createdAt);
        params.push(opts.cursor.id);
        const u = params.length - 2;
        const c = params.length - 1;
        const i = params.length;
        cursorClause = `AND (r.upvote_count, r.created_at, r.id) < ($${u}::int, $${c}::timestamptz, $${i}::uuid)`;
      } else {
        params.push(opts.cursor.createdAt);
        params.push(opts.cursor.id);
        const c = params.length - 1;
        const i = params.length;
        cursorClause = `AND (r.created_at, r.id) > ($${c}::timestamptz, $${i}::uuid)`;
      }
    }

    const orderBy =
      opts.sort === 'top'
        ? 'r.upvote_count DESC, r.created_at DESC, r.id DESC'
        : 'r.created_at ASC, r.id ASC';

    params.push(opts.limit + 1);
    const limitIdx = params.length;
    const sql = `
      SELECT r.*,
             EXISTS (
               SELECT 1 FROM forum_votes v
                WHERE v.user_id = $1
                  AND v.target_type = 'reply'
                  AND v.target_id = r.id
             ) AS viewer_upvoted
        FROM forum_replies r
       WHERE ${conditions.join(' AND ')}
         ${cursorClause}
       ORDER BY ${orderBy}
       LIMIT $${limitIdx}
    `;
    return tenant.queryRunner.query(sql, params) as Promise<ReplyRowWithExtras[]>;
  }
}

export function normalizeReply(
  row: ReplyRow & { viewer_upvoted?: unknown },
): ReplyRowWithExtras {
  return {
    ...row,
    created_at: new Date(row.created_at),
    deleted_at: row.deleted_at ? new Date(row.deleted_at) : null,
    hidden_at: row.hidden_at ? new Date(row.hidden_at) : null,
    viewer_upvoted: Boolean(row.viewer_upvoted),
  };
}

export function toReplyDto(row: ReplyRowWithExtras): {
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
} {
  return {
    id: row.id,
    postId: row.post_id,
    parentReplyId: row.parent_reply_id,
    depth: (row.depth === 2 ? 2 : 1) as 1 | 2,
    authorId: row.author_user_id,
    authorDisplayName: row.author_user_id.replace(/^USR/i, 'User '),
    body: row.body,
    upvoteCount: row.upvote_count,
    isViewerUpvoted: Boolean(row.viewer_upvoted),
    hiddenAt: row.hidden_at ? row.hidden_at.toISOString() : null,
    hiddenBy: row.hidden_by_user_id,
    createdAt: row.created_at.toISOString(),
    deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
  };
}
