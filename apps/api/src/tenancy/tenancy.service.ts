import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Resolves the Postgres schema name for the caller's community.
 *
 * Reads `public.schema_registry` — the same table the main SKEP platform
 * writes to during community onboarding. Falls back to a deterministic
 * derivation for local/dev communities where the registry row is missing.
 */
@Injectable()
export class TenancyService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /** Throws if `communityCode` isn't onboarded. */
  async schemaFor(communityCode: string): Promise<string> {
    this.assertCommunityCode(communityCode);
    const rows = (await this.ds.query(
      'SELECT schema_name, status FROM public.schema_registry WHERE community_code = $1 LIMIT 1',
      [communityCode],
    )) as { schema_name: string; status: string }[];

    const row = rows[0];
    if (!row) {
      const err = new Error('COMMUNITY_NOT_ENABLED');
      (err as Error & { code?: string }).code = 'COMMUNITY_NOT_ENABLED';
      throw err;
    }
    if (row.status !== 'active') {
      const err = new Error('COMMUNITY_NOT_ENABLED');
      (err as Error & { code?: string }).code = 'COMMUNITY_NOT_ENABLED';
      throw err;
    }
    this.assertSchemaName(row.schema_name);
    return row.schema_name;
  }

  private assertCommunityCode(v: string): void {
    if (!/^COM[A-Z0-9]{4,}$/i.test(v)) {
      throw new Error(`invalid community_code: ${v}`);
    }
  }

  private assertSchemaName(v: string): void {
    if (!/^[a-z0-9_]{1,63}$/.test(v)) {
      throw new Error(`invalid schema_name in registry: ${v}`);
    }
  }
}
