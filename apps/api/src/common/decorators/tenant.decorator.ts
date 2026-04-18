import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import {
  TENANT_CONTEXT,
  type RequestWithTenant,
  type TenantContext,
} from '../../tenancy/tenant-query';

/**
 * Injects the request-scoped tenant context (community code, schema name,
 * QueryRunner with `search_path` already set).
 *
 * Services depend on `TenantContext.queryRunner` to run schema-scoped
 * queries. Never bypass this to go through the raw DataSource — doing so
 * would skip the search_path hop and leak across tenants.
 */
export const Tenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const req = ctx.switchToHttp().getRequest<Request & RequestWithTenant>();
    const tenant = req[TENANT_CONTEXT];
    if (!tenant) {
      throw new Error(
        'Tenant decorator used without tenancy middleware — check module wiring',
      );
    }
    return tenant;
  },
);
