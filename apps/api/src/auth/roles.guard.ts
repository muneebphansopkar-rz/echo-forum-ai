import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from './roles.decorator';
import { hasRole, type AuthenticatedUser, type ForumRole } from './authenticated-user';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<ForumRole[] | undefined>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = req.user;
    if (!user) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Authenticated user missing on request',
      });
    }

    const ok = required.some((role) => hasRole(user, role));
    if (!ok) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient role for this action',
      });
    }
    return true;
  }
}
