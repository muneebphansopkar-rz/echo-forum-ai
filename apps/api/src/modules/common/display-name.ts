/**
 * The real SKEP platform resolves platform user ids to display names via the
 * user directory service. For the MVP we derive a deterministic placeholder
 * from the id so the frontend has something non-empty to render.
 *
 * Keep this a pure function — a single swap point when the directory lookup
 * (batched + cached) lands.
 */
export function displayNameFor(platformUserId: string): string {
  if (!platformUserId) return 'Unknown';
  return platformUserId.replace(/^USR/i, 'User ').trim();
}
