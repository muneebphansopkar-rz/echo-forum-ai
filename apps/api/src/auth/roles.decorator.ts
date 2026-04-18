import { SetMetadata } from '@nestjs/common';
import type { ForumRole } from './authenticated-user';

export const ROLES_KEY = 'forum:roles';

/**
 * Declares the minimum role required to hit an endpoint.
 * Pair with `RolesGuard` (registered alongside `MockJwtGuard`).
 */
export const Roles = (...roles: ForumRole[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
