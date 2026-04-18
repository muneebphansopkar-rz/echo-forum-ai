import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../auth/authenticated-user';

/**
 * Injects the authenticated user extracted from the JWT by the guard.
 *
 * CRITICAL RULE (apps/api/CONTEXT.md): userId always comes from here —
 * NEVER from request body or query. Real Keycloak integration will swap
 * the guard, not this decorator.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    if (!req.user) {
      throw new Error('CurrentUser used without an auth guard — check module wiring');
    }
    return req.user;
  },
);
