import type { QueryRunner } from 'typeorm';

/**
 * The request-scoped tenant query surface. Every repository/service takes
 * this instead of raw `Repository<T>` so the `SET LOCAL search_path` hop is
 * always honoured. See tenancy.middleware.ts for the attach point.
 */
export interface TenantContext {
  communityCode: string;
  schemaName: string;
  queryRunner: QueryRunner;
}

export const TENANT_CONTEXT = 'tenantContext';

/** Type-safe Request extension used by middleware + decorator. */
export interface RequestWithTenant {
  [TENANT_CONTEXT]?: TenantContext;
}
