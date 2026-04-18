import { Injectable } from '@nestjs/common';
import type { TenantContext } from '../../tenancy/tenant-query';

export interface TagRow {
  id: string;
  slug: string;
  label: string;
  color: string;
  is_system: boolean;
  /** Present on `listAll` (LEFT JOIN with forum_post_tags). */
  post_count?: number;
}

/**
 * Tags repository — always takes `TenantContext.queryRunner` so the
 * `search_path` set by the tenancy middleware is honoured. The schema-per-
 * community rule forbids going through the raw DataSource.
 */
@Injectable()
export class TagsRepository {
  async listAll(tenant: TenantContext): Promise<TagRow[]> {
    // Aggregates the live-post count per tag so the right panel can rank
    // them without a second round-trip. Soft-deleted posts are excluded.
    return tenant.queryRunner.query(
      `SELECT t.id, t.slug, t.label, t.color, t.is_system,
              COUNT(p.id) FILTER (WHERE p.deleted_at IS NULL)::int AS post_count
         FROM forum_tags t
         LEFT JOIN forum_post_tags pt ON pt.tag_id = t.id
         LEFT JOIN forum_posts p ON p.id = pt.post_id
         GROUP BY t.id
         ORDER BY post_count DESC, t.is_system DESC, t.label ASC`,
    ) as Promise<TagRow[]>;
  }

  async findBySlug(
    tenant: TenantContext,
    slug: string,
  ): Promise<TagRow | null> {
    const rows = (await tenant.queryRunner.query(
      `SELECT id, slug, label, color, is_system
         FROM forum_tags
         WHERE slug = $1
         LIMIT 1`,
      [slug],
    )) as TagRow[];
    return rows[0] ?? null;
  }

  async findByIds(
    tenant: TenantContext,
    ids: readonly string[],
  ): Promise<TagRow[]> {
    if (ids.length === 0) return [];
    return tenant.queryRunner.query(
      `SELECT id, slug, label, color, is_system
         FROM forum_tags
         WHERE id = ANY($1::uuid[])`,
      [ids],
    ) as Promise<TagRow[]>;
  }

  async create(
    tenant: TenantContext,
    input: { slug: string; label: string; color: string },
  ): Promise<TagRow> {
    const rows = (await tenant.queryRunner.query(
      `INSERT INTO forum_tags (slug, label, color, is_system)
         VALUES ($1, $2, $3, false)
         RETURNING id, slug, label, color, is_system`,
      [input.slug, input.label, input.color],
    )) as TagRow[];
    return rows[0];
  }
}

export function tagRowToDto(row: TagRow): {
  id: string;
  slug: string;
  label: string;
  color: string;
  isSystem: boolean;
  postCount: number;
} {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    color: row.color,
    isSystem: row.is_system,
    postCount: row.post_count ?? 0,
  };
}
