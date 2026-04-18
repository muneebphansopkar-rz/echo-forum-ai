import { Injectable } from '@nestjs/common';
import type { TenantContext } from '../../tenancy/tenant-query';
import type { FeedKind, TopWindow } from './dto/list-posts.query';

export interface PostRow {
  id: string;
  author_user_id: string;
  title: string;
  body: string;
  excerpt: string;
  upvote_count: number;
  reply_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  hidden_at: Date | null;
  hidden_by_user_id: string | null;
  hide_reason: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface PostRowWithExtras extends PostRow {
  viewer_upvoted: boolean;
}

export interface FeedCursor {
  id: string;
  createdAt: string;
  /** Sort-key anchor — hot uses the score, top uses upvotes. Optional. */
  anchor?: number;
}

export interface ListOptions {
  sort: FeedKind;
  window?: TopWindow;
  tagSlug?: string;
  limit: number;
  cursor?: FeedCursor;
  viewerUserId: string;
}

@Injectable()
export class PostsRepository {
  async insert(
    tenant: TenantContext,
    input: {
      authorUserId: string;
      title: string;
      body: string;
    },
  ): Promise<PostRow> {
    const rows = (await tenant.queryRunner.query(
      `INSERT INTO forum_posts (author_user_id, title, body)
         VALUES ($1, $2, $3)
         RETURNING *`,
      [input.authorUserId, input.title, input.body],
    )) as PostRow[];
    return rows[0];
  }

  async attachTags(
    tenant: TenantContext,
    postId: string,
    tagIds: readonly string[],
  ): Promise<void> {
    if (tagIds.length === 0) return;
    // The DB-side trigger enforces the max-3 cap; we still de-dupe client-side.
    const unique = [...new Set(tagIds)];
    await tenant.queryRunner.query(
      `INSERT INTO forum_post_tags (post_id, tag_id)
         SELECT $1::uuid, unnest($2::uuid[])
         ON CONFLICT DO NOTHING`,
      [postId, unique],
    );
  }

  async replaceTags(
    tenant: TenantContext,
    postId: string,
    tagIds: readonly string[],
  ): Promise<void> {
    await tenant.queryRunner.query(
      `DELETE FROM forum_post_tags WHERE post_id = $1`,
      [postId],
    );
    await this.attachTags(tenant, postId, tagIds);
  }

  async findByIdWithViewer(
    tenant: TenantContext,
    postId: string,
    viewerUserId: string,
  ): Promise<PostRowWithExtras | null> {
    const rows = (await tenant.queryRunner.query(
      `SELECT p.*,
              EXISTS (
                SELECT 1 FROM forum_votes v
                 WHERE v.user_id = $2
                   AND v.target_type = 'post'
                   AND v.target_id = p.id
              ) AS viewer_upvoted
         FROM forum_posts p
         WHERE p.id = $1
           AND p.deleted_at IS NULL
         LIMIT 1`,
      [postId, viewerUserId],
    )) as PostRowWithExtras[];
    return rows[0] ?? null;
  }

  async findByIdRaw(
    tenant: TenantContext,
    postId: string,
  ): Promise<PostRow | null> {
    const rows = (await tenant.queryRunner.query(
      `SELECT * FROM forum_posts WHERE id = $1 LIMIT 1`,
      [postId],
    )) as PostRow[];
    return rows[0] ?? null;
  }

  async update(
    tenant: TenantContext,
    postId: string,
    patch: { title?: string; body?: string },
  ): Promise<PostRow> {
    // Build a dynamic SET clause safely via parameter binding.
    const sets: string[] = [];
    const params: unknown[] = [];
    if (patch.title !== undefined) {
      params.push(patch.title);
      sets.push(`title = $${params.length}`);
    }
    if (patch.body !== undefined) {
      params.push(patch.body);
      sets.push(`body = $${params.length}`);
    }
    sets.push('updated_at = now()');

    params.push(postId);
    // TypeORM's queryRunner.query for UPDATE...RETURNING returns
    // `[rows, affectedCount]`; normalise before reading row[0].
    const raw = (await tenant.queryRunner.query(
      `UPDATE forum_posts
          SET ${sets.join(', ')}
        WHERE id = $${params.length}
          AND deleted_at IS NULL
      RETURNING *`,
      params,
    )) as PostRow[] | [PostRow[], number];
    const rows = (Array.isArray(raw[0]) ? raw[0] : raw) as PostRow[];
    return rows[0];
  }

  async softDelete(tenant: TenantContext, postId: string): Promise<void> {
    await tenant.queryRunner.query(
      `UPDATE forum_posts SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`,
      [postId],
    );
  }

  async setPinned(
    tenant: TenantContext,
    postId: string,
    pinned: boolean,
  ): Promise<void> {
    await tenant.queryRunner.query(
      `UPDATE forum_posts SET is_pinned = $2, updated_at = now()
         WHERE id = $1 AND deleted_at IS NULL`,
      [postId, pinned],
    );
  }

  async setLocked(
    tenant: TenantContext,
    postId: string,
    locked: boolean,
  ): Promise<void> {
    await tenant.queryRunner.query(
      `UPDATE forum_posts SET is_locked = $2, updated_at = now()
         WHERE id = $1 AND deleted_at IS NULL`,
      [postId, locked],
    );
  }

  async setHidden(
    tenant: TenantContext,
    postId: string,
    hidden: {
      hiddenAt: Date | null;
      hiddenByUserId: string | null;
      reason: string | null;
    },
  ): Promise<void> {
    await tenant.queryRunner.query(
      `UPDATE forum_posts
          SET hidden_at = $2,
              hidden_by_user_id = $3,
              hide_reason = $4,
              updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL`,
      [postId, hidden.hiddenAt, hidden.hiddenByUserId, hidden.reason],
    );
  }

  async incrementReplyCount(
    tenant: TenantContext,
    postId: string,
    delta: number,
  ): Promise<void> {
    await tenant.queryRunner.query(
      `UPDATE forum_posts
          SET reply_count = GREATEST(reply_count + $2, 0)
        WHERE id = $1`,
      [postId, delta],
    );
  }

  async loadTagsForPosts(
    tenant: TenantContext,
    postIds: readonly string[],
  ): Promise<Map<string, { id: string; slug: string; label: string; color: string; is_system: boolean }[]>> {
    const out = new Map<
      string,
      { id: string; slug: string; label: string; color: string; is_system: boolean }[]
    >();
    if (postIds.length === 0) return out;
    const rows = (await tenant.queryRunner.query(
      `SELECT pt.post_id,
              t.id, t.slug, t.label, t.color, t.is_system
         FROM forum_post_tags pt
         JOIN forum_tags t ON t.id = pt.tag_id
        WHERE pt.post_id = ANY($1::uuid[])
        ORDER BY t.label ASC`,
      [postIds],
    )) as Array<{
      post_id: string;
      id: string;
      slug: string;
      label: string;
      color: string;
      is_system: boolean;
    }>;
    for (const row of rows) {
      const list = out.get(row.post_id) ?? [];
      list.push({
        id: row.id,
        slug: row.slug,
        label: row.label,
        color: row.color,
        is_system: row.is_system,
      });
      out.set(row.post_id, list);
    }
    return out;
  }

  async list(
    tenant: TenantContext,
    opts: ListOptions,
  ): Promise<PostRowWithExtras[]> {
    const params: unknown[] = [opts.viewerUserId];
    const where: string[] = ['p.deleted_at IS NULL'];

    if (opts.tagSlug) {
      params.push(opts.tagSlug);
      where.push(
        `EXISTS (
           SELECT 1 FROM forum_post_tags pt
             JOIN forum_tags t ON t.id = pt.tag_id
            WHERE pt.post_id = p.id AND t.slug = $${params.length}
         )`,
      );
    }

    // Window filter for Top
    if (opts.sort === 'top') {
      const windowClause = topWindowClause(opts.window ?? 'all');
      if (windowClause) where.push(`p.created_at > ${windowClause}`);
    }

    const orderBy = buildOrderBy(opts.sort);

    // Cursor — keyset on the primary sort signature. Because pinned posts
    // surface first and are rarely numerous we fetch them once inside the
    // same query and use a (sort_anchor, created_at, id) tuple after the
    // pinned head. Simpler approach: cursor always encodes createdAt+id and
    // we apply `(p.is_pinned, sort_expr, p.created_at, p.id)` tie-breaking
    // and filter `created_at < cursor.createdAt OR (created_at = ... AND id < ...)`.
    let cursorClause = '';
    if (opts.cursor) {
      params.push(opts.cursor.createdAt);
      params.push(opts.cursor.id);
      const createdAtIdx = params.length - 1;
      const idIdx = params.length;
      cursorClause = `AND (p.is_pinned = false) AND (p.created_at, p.id) < ($${createdAtIdx}::timestamptz, $${idIdx}::uuid)`;
    }

    params.push(opts.limit + 1);
    const limitIdx = params.length;

    const sql = `
      SELECT p.*,
             EXISTS (
               SELECT 1 FROM forum_votes v
                WHERE v.user_id = $1
                  AND v.target_type = 'post'
                  AND v.target_id = p.id
             ) AS viewer_upvoted
        FROM forum_posts p
       WHERE ${where.join(' AND ')}
         ${cursorClause}
       ORDER BY ${orderBy}
       LIMIT $${limitIdx}
    `;

    return tenant.queryRunner.query(sql, params) as Promise<PostRowWithExtras[]>;
  }
}

function buildOrderBy(sort: FeedKind): string {
  switch (sort) {
    case 'hot':
      return [
        'p.is_pinned DESC',
        '(p.upvote_count::float / power(extract(epoch from (now() - p.created_at))/3600 + 2, 1.5)) DESC',
        'p.created_at DESC',
        'p.id DESC',
      ].join(', ');
    case 'top':
      return [
        'p.is_pinned DESC',
        'p.upvote_count DESC',
        'p.created_at DESC',
        'p.id DESC',
      ].join(', ');
    case 'new':
    default:
      return [
        'p.is_pinned DESC',
        'p.created_at DESC',
        'p.id DESC',
      ].join(', ');
  }
}

function topWindowClause(window: TopWindow): string | null {
  switch (window) {
    case 'today':
      return `now() - interval '1 day'`;
    case 'week':
      return `now() - interval '7 days'`;
    case 'all':
    default:
      return null;
  }
}
