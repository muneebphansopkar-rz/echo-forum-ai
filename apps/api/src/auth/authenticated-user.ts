/**
 * Shape of the request-scoped authenticated user.
 *
 * Intentionally matches the SKEP JWT claims in project/SKEP-INTEGRATION.md so
 * the real Keycloak guard is a one-file swap (see apps/api/CONTEXT.md).
 */
export type ForumRole = 'MEMBER' | 'MODERATOR' | 'ADMIN' | 'OWNER';

export interface AuthenticatedUser {
  /** Internal Keycloak `sub` claim — UUID. */
  userId: string;
  /** SKEP platform user id — stable external id, used in @mentions. */
  platformUserId: string;
  /** Community code (e.g. COM96179941) — drives schema resolution. */
  communityId: string;
  /** Organization the community belongs to. */
  orgId: string;
  /** Roles this user holds in this community. */
  roles: ForumRole[];
}

export function hasRole(user: AuthenticatedUser, required: ForumRole): boolean {
  const hierarchy: Record<ForumRole, number> = {
    MEMBER: 1,
    MODERATOR: 2,
    ADMIN: 3,
    OWNER: 4,
  };
  const userLevel = Math.max(...user.roles.map((r) => hierarchy[r] ?? 0));
  return userLevel >= hierarchy[required];
}
