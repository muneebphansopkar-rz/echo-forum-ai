import type { AuthenticatedUser } from '../../auth/authenticated-user';

/**
 * Stub limit checks and usage reporting.
 *
 * The SKEP platform exposes real per-community/per-user quotas; for the MVP
 * we short-circuit to "always allowed" so the service pipeline below can be
 * written once and swapped when the quota gateway lands.
 *
 *   checkLimits → tenant-scoped write → reportUsage → commit → events.publish
 */
export interface LimitContext {
  user: AuthenticatedUser;
  action:
    | 'forum.post.create'
    | 'forum.post.update'
    | 'forum.post.delete'
    | 'forum.reply.create'
    | 'forum.reply.delete'
    | 'forum.vote.toggle'
    | 'forum.tag.create'
    | 'forum.moderation.pin'
    | 'forum.moderation.lock'
    | 'forum.moderation.hide'
    | 'forum.moderation.restore'
    | 'forum.moderation.retag';
}

export async function checkLimits(_ctx: LimitContext): Promise<boolean> {
  return true;
}

export async function reportUsage(_ctx: LimitContext): Promise<void> {
  // No-op until SKEP usage gateway is wired.
}
