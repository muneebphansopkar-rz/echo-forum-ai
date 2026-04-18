import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { DataSource } from 'typeorm';
import { AppConfigService } from '../config/app-config.service';
import { TenancyService } from './tenancy.service';
import {
  TENANT_CONTEXT,
  type RequestWithTenant,
  type TenantContext,
} from './tenant-query';

/**
 * Per-request tenancy enforcement.
 *
 * 1. Decodes the bearer JWT (without verifying — that's the guard's job).
 * 2. Resolves the target schema from `public.schema_registry`.
 * 3. Acquires a dedicated QueryRunner, issues `SET LOCAL search_path TO "<schema>", public`.
 * 4. Attaches the runner to `req[TENANT_CONTEXT]` for the request lifetime.
 * 5. Releases the runner when the response finishes (success OR error).
 *
 * Skipped when no bearer token is present — the MockJwtGuard will reject
 * the request before any controller logic runs. Also skipped for explicitly
 * public endpoints (health) by checking the request URL.
 */
@Injectable()
export class TenancyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenancyMiddleware.name);

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly tenancy: TenancyService,
    private readonly config: AppConfigService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const communityCode = this.extractCommunityFromJwt(req);
    if (!communityCode) {
      // No JWT → guard will reject. Don't spend a connection.
      next();
      return;
    }

    let schemaName: string;
    try {
      schemaName = await this.tenancy.schemaFor(communityCode);
    } catch (err) {
      // Surface as 401 COMMUNITY_NOT_ENABLED via the filter.
      next(err);
      return;
    }

    const runner = this.ds.createQueryRunner();
    try {
      await runner.connect();
      // Session-level (no LOCAL) so reads outside transactions also see the
      // correct schema. We reset on release to avoid leaking into pooled peers.
      await runner.query(`SET search_path TO "${schemaName}", public`);
    } catch (err) {
      await runner.release().catch(() => undefined);
      next(err);
      return;
    }

    const ctx: TenantContext = { communityCode, schemaName, queryRunner: runner };
    (req as Request & RequestWithTenant)[TENANT_CONTEXT] = ctx;

    res.on('close', () => {
      void (async () => {
        try {
          // Reset before returning the connection to the pool.
          if (!runner.isReleased) {
            await runner.query('RESET search_path').catch(() => undefined);
          }
        } finally {
          await runner
            .release()
            .catch((e) =>
              this.logger.error(
                `QueryRunner release failed: ${(e as Error).message}`,
              ),
            );
        }
      })();
    });

    next();
  }

  private extractCommunityFromJwt(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return null;
    const token = header.slice('Bearer '.length).trim();
    if (!token) return null;
    try {
      // Verify — we want to bail early on invalid tokens so we don't waste
      // a connection. The MockJwtGuard re-verifies and attaches the user.
      const claims = jwt.verify(token, this.config.jwtSecret, {
        issuer: this.config.jwtIssuer,
        algorithms: ['HS256'],
      }) as Record<string, unknown>;
      const code = claims.community_code;
      return typeof code === 'string' ? code : null;
    } catch {
      return null;
    }
  }
}
