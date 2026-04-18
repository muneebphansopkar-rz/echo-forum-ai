import { Injectable } from '@nestjs/common';
import type { TenantContext } from '../../tenancy/tenant-query';
import type { VoteTargetType } from './dto/toggle-vote.dto';

@Injectable()
export class VotesRepository {
  async hasVote(
    tenant: TenantContext,
    userId: string,
    targetType: VoteTargetType,
    targetId: string,
  ): Promise<boolean> {
    const rows = (await tenant.queryRunner.query(
      `SELECT 1 FROM forum_votes
         WHERE user_id = $1 AND target_type = $2 AND target_id = $3::uuid
         LIMIT 1`,
      [userId, targetType, targetId],
    )) as unknown[];
    return rows.length > 0;
  }

  async insert(
    tenant: TenantContext,
    userId: string,
    targetType: VoteTargetType,
    targetId: string,
  ): Promise<void> {
    await tenant.queryRunner.query(
      `INSERT INTO forum_votes (user_id, target_type, target_id)
         VALUES ($1, $2, $3::uuid)
         ON CONFLICT (user_id, target_type, target_id) DO NOTHING`,
      [userId, targetType, targetId],
    );
  }

  async remove(
    tenant: TenantContext,
    userId: string,
    targetType: VoteTargetType,
    targetId: string,
  ): Promise<void> {
    await tenant.queryRunner.query(
      `DELETE FROM forum_votes
         WHERE user_id = $1 AND target_type = $2 AND target_id = $3::uuid`,
      [userId, targetType, targetId],
    );
  }

  async adjustTargetCount(
    tenant: TenantContext,
    targetType: VoteTargetType,
    targetId: string,
    delta: number,
  ): Promise<number | null> {
    const table =
      targetType === 'post' ? 'forum_posts' : 'forum_replies';
    // TypeORM's queryRunner.query for UPDATE...RETURNING on the pg driver
    // returns `[rows, affectedCount]` — not a flat rows array. Unwrap safely
    // so we return the post-update count instead of undefined.
    const raw = (await tenant.queryRunner.query(
      `UPDATE ${table}
          SET upvote_count = GREATEST(upvote_count + $2, 0)
        WHERE id = $1::uuid
      RETURNING upvote_count`,
      [targetId, delta],
    )) as
      | Array<{ upvote_count: number }>
      | [Array<{ upvote_count: number }>, number];

    const rows = Array.isArray(raw[0]) ? (raw[0] as Array<{ upvote_count: number }>) : (raw as Array<{ upvote_count: number }>);
    return rows[0]?.upvote_count ?? null;
  }

  async exists(
    tenant: TenantContext,
    targetType: VoteTargetType,
    targetId: string,
  ): Promise<boolean> {
    const table =
      targetType === 'post' ? 'forum_posts' : 'forum_replies';
    const rows = (await tenant.queryRunner.query(
      `SELECT 1 FROM ${table} WHERE id = $1::uuid AND deleted_at IS NULL LIMIT 1`,
      [targetId],
    )) as unknown[];
    return rows.length > 0;
  }
}
