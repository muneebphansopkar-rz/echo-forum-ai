import { Injectable } from '@nestjs/common';
import type { TenantContext } from '../../tenancy/tenant-query';

export interface ModerationActionInput {
  actorUserId: string;
  action:
    | 'pin'
    | 'unpin'
    | 'lock'
    | 'unlock'
    | 'hide'
    | 'restore'
    | 'tag_override';
  targetType: 'post' | 'reply';
  targetId: string;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ModerationRepository {
  async record(
    tenant: TenantContext,
    input: ModerationActionInput,
  ): Promise<{ id: string; created_at: Date }> {
    const rows = (await tenant.queryRunner.query(
      `INSERT INTO forum_moderation_actions
         (actor_user_id, action, target_type, target_id, reason, metadata)
         VALUES ($1, $2, $3, $4::uuid, $5, COALESCE($6::jsonb, '{}'::jsonb))
       RETURNING id, created_at`,
      [
        input.actorUserId,
        input.action,
        input.targetType,
        input.targetId,
        input.reason ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ],
    )) as Array<{ id: string; created_at: Date }>;
    return rows[0];
  }
}
