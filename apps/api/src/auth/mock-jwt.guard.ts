import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { AppConfigService } from '../config/app-config.service';
import type { AuthenticatedUser, ForumRole } from './authenticated-user';

export const IS_PUBLIC_KEY = 'auth:isPublic';

/**
 * Mock JWT guard for the hackathon build.
 *
 * Validates a dev-signed SKEP JWT (see project/SKEP-INTEGRATION.md for the
 * claim shape) and attaches `AuthenticatedUser` to the request. It is
 * deliberately the ONLY auth surface in the app so swapping to Passport +
 * Keycloak is a one-file change.
 */
@Injectable()
export class MockJwtGuard implements CanActivate {
  private readonly logger = new Logger(MockJwtGuard.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = extractBearerToken(req);
    if (!token) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Missing bearer token',
      });
    }

    try {
      const claims = jwt.verify(token, this.config.jwtSecret, {
        issuer: this.config.jwtIssuer,
        algorithms: ['HS256'],
      }) as Record<string, unknown>;

      req.user = toAuthenticatedUser(claims);
      return true;
    } catch (err) {
      this.logger.debug(`JWT rejected: ${(err as Error).message}`);
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      });
    }
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

function toAuthenticatedUser(claims: Record<string, unknown>): AuthenticatedUser {
  const sub = claims.sub;
  const platformUserId = claims.platform_user_id;
  const communityId = claims.community_code;
  const orgId = claims.org_id;
  const roles = claims.roles;
  const type = claims.type;

  if (
    typeof sub !== 'string' ||
    typeof platformUserId !== 'string' ||
    typeof communityId !== 'string' ||
    typeof orgId !== 'string' ||
    !Array.isArray(roles) ||
    type !== 'COMMUNITY'
  ) {
    throw new UnauthorizedException({
      code: 'UNAUTHORIZED',
      message: 'JWT claims malformed',
    });
  }

  return {
    userId: sub,
    platformUserId,
    communityId,
    orgId,
    roles: roles.filter(isForumRole),
  };
}

function isForumRole(value: unknown): value is ForumRole {
  return (
    value === 'MEMBER' ||
    value === 'MODERATOR' ||
    value === 'ADMIN' ||
    value === 'OWNER'
  );
}
