import { Injectable } from '@nestjs/common';
import type { TenantContext } from '../../tenancy/tenant-query';

export interface CommunityTotalsRow {
  posts: number;
  replies: number;
  upvotes: number;
  members: number;
}

export interface ContributorRow {
  author_user_id: string;
  upvotes_today: number;
}

@Injectable()
export class StatsRepository {
  /**
   * Fetch live totals for the community. `members` is a proxy count —
   * distinct author ids across posts + replies. When the platform exposes
   * the real member roster this switches to a single lookup.
   */
  async totals(tenant: TenantContext): Promise<CommunityTotalsRow> {
    const rows = (await tenant.queryRunner.query(
      `SELECT
         (SELECT count(*)::int FROM forum_posts   WHERE deleted_at IS NULL) AS posts,
         (SELECT count(*)::int FROM forum_replies WHERE deleted_at IS NULL) AS replies,
         (SELECT count(*)::int FROM forum_votes)                            AS upvotes,
         (SELECT count(DISTINCT author_user_id)::int FROM (
            SELECT author_user_id FROM forum_posts   WHERE deleted_at IS NULL
            UNION
            SELECT author_user_id FROM forum_replies WHERE deleted_at IS NULL
         ) AS authors) AS members`,
    )) as CommunityTotalsRow[];
    return (
      rows[0] ?? { posts: 0, replies: 0, upvotes: 0, members: 0 }
    );
  }

  /**
   * Top N authors by upvotes received today (UTC day boundary). Combines
   * votes against both their posts and replies.
   */
  async topContributors(
    tenant: TenantContext,
    limit = 3,
  ): Promise<ContributorRow[]> {
    return tenant.queryRunner.query(
      `SELECT author AS author_user_id,
              SUM(upvotes)::int AS upvotes_today
         FROM (
           SELECT p.author_user_id AS author, count(*)::int AS upvotes
             FROM forum_votes v
             JOIN forum_posts p
               ON p.id = v.target_id
              AND v.target_type = 'post'
            WHERE v.created_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
              AND p.deleted_at IS NULL
            GROUP BY p.author_user_id
           UNION ALL
           SELECT r.author_user_id AS author, count(*)::int AS upvotes
             FROM forum_votes v
             JOIN forum_replies r
               ON r.id = v.target_id
              AND v.target_type = 'reply'
            WHERE v.created_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
              AND r.deleted_at IS NULL
            GROUP BY r.author_user_id
         ) AS contributions
         GROUP BY author
         ORDER BY upvotes_today DESC
         LIMIT $1`,
      [limit],
    ) as Promise<ContributorRow[]>;
  }
}
