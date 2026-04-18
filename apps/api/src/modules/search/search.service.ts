import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/authenticated-user';
import { clampLimit } from '../../common/pagination/cursor';
import type { TenantContext } from '../../tenancy/tenant-query';
import { toPostSummary } from '../posts/posts.mapper';
import type { PostRowWithExtras } from '../posts/posts.repository';
import { PostsRepository } from '../posts/posts.repository';
import { tagRowToDto } from '../tags/tags.repository';
import type { SearchQuery } from './dto/search.query';
import type { SearchListResponse, SearchResultDto } from './dto/search.response';

interface SearchRow {
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
  viewer_upvoted: boolean;
  rank: number;
  title_headline: string | null;
  body_headline: string | null;
}

@Injectable()
export class SearchService {
  constructor(private readonly posts: PostsRepository) {}

  async search(
    user: AuthenticatedUser,
    tenant: TenantContext,
    query: SearchQuery,
  ): Promise<SearchListResponse> {
    const limit = clampLimit(query.limit);
    // Cursor encodes the rank + id so we can stable-paginate over ts_rank.
    const cursor = query.cursor ? decode(query.cursor) : null;

    const params: unknown[] = [user.platformUserId, query.q];
    const whereExtras: string[] = ['p.deleted_at IS NULL'];
    if (query.tag) {
      params.push(query.tag);
      whereExtras.push(
        `EXISTS (
           SELECT 1 FROM forum_post_tags pt
             JOIN forum_tags t ON t.id = pt.tag_id
            WHERE pt.post_id = p.id AND t.slug = $${params.length}
         )`,
      );
    }

    let cursorClause = '';
    if (cursor) {
      params.push(cursor.rank);
      params.push(cursor.id);
      const r = params.length - 1;
      const i = params.length;
      cursorClause = `AND (ts_rank_cd(p.search_tsv, plainto_tsquery('english', $2)), p.id) < ($${r}::float4, $${i}::uuid)`;
    }

    params.push(limit + 1);
    const limitIdx = params.length;

    const sql = `
      WITH q AS (SELECT plainto_tsquery('english', $2) AS tsq)
      SELECT p.*,
             EXISTS (
               SELECT 1 FROM forum_votes v
                WHERE v.user_id = $1
                  AND v.target_type = 'post'
                  AND v.target_id = p.id
             ) AS viewer_upvoted,
             ts_rank_cd(p.search_tsv, (SELECT tsq FROM q)) AS rank,
             ts_headline(
               'english', p.title, (SELECT tsq FROM q),
               'StartSel=<mark>,StopSel=</mark>,MaxWords=15,MinWords=3,ShortWord=3'
             ) AS title_headline,
             ts_headline(
               'english', p.body, (SELECT tsq FROM q),
               'StartSel=<mark>,StopSel=</mark>,MaxWords=30,MinWords=8,ShortWord=3'
             ) AS body_headline
        FROM forum_posts p
       WHERE ${whereExtras.join(' AND ')}
         AND p.search_tsv @@ (SELECT tsq FROM q)
         ${cursorClause}
       ORDER BY rank DESC, p.id DESC
       LIMIT $${limitIdx}
    `;

    const rows = (await tenant.queryRunner.query(sql, params)) as SearchRow[];
    const slice = rows.slice(0, limit);
    const nextRaw = rows.length > limit ? rows[limit] : null;

    const tagMap = await this.posts.loadTagsForPosts(
      tenant,
      slice.map((r) => r.id),
    );

    const items: SearchResultDto[] = slice.map((row) => {
      const norm: PostRowWithExtras = {
        ...row,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        deleted_at: row.deleted_at ? new Date(row.deleted_at) : null,
        hidden_at: row.hidden_at ? new Date(row.hidden_at) : null,
        viewer_upvoted: Boolean(row.viewer_upvoted),
      };
      const summary = toPostSummary(
        norm,
        (tagMap.get(row.id) ?? []).map(tagRowToDto),
      );
      return {
        ...summary,
        highlights: {
          title: row.title_headline,
          body: row.body_headline,
        },
      };
    });

    const nextCursor = nextRaw
      ? encode({ rank: Number(nextRaw.rank), id: nextRaw.id })
      : null;

    return { items, nextCursor };
  }
}

function encode(p: { rank: number; id: string }): string {
  return Buffer.from(JSON.stringify(p), 'utf8').toString('base64url');
}

function decode(s: string): { rank: number; id: string } | null {
  try {
    const obj = JSON.parse(
      Buffer.from(s, 'base64url').toString('utf8'),
    ) as { rank?: unknown; id?: unknown };
    if (typeof obj.rank !== 'number' || typeof obj.id !== 'string') return null;
    return { rank: obj.rank, id: obj.id };
  } catch {
    return null;
  }
}
