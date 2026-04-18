import type { TenantContext } from '../../tenancy/tenant-query';

/**
 * Re-applies `search_path` inside the current transaction.
 *
 * The tenancy middleware issues `SET LOCAL search_path` once on the
 * QueryRunner's connection, but `SET LOCAL` only persists for the duration
 * of the *current* transaction. When a service opens its own explicit
 * `BEGIN`, the search_path resets to the session default — so we
 * re-declare it here at the top of every service transaction.
 */
export async function beginWithSearchPath(
  tenant: TenantContext,
): Promise<void> {
  await tenant.queryRunner.query('BEGIN');
  // Quote the schema name to match the middleware's style; validated upstream.
  await tenant.queryRunner.query(
    `SET LOCAL search_path TO "${tenant.schemaName}", public`,
  );
}
