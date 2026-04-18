import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

/**
 * Dev-only mock-session endpoint.
 *
 * Mints a SKEP-shaped JWT (HS256, 60-minute expiry) using `NEXT_PUBLIC_MOCK_JWT_SECRET`
 * so the backend's `MockJwtGuard` can verify it. The frontend `useMockSession`
 * hook fetches this once on boot and stashes the token in `localStorage`.
 *
 * This entire route goes away when real NextAuth/Keycloak lands.
 */

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(
  payload: Record<string, unknown>,
  secret: string,
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = b64url(JSON.stringify(header));
  const encodedPayload = b64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const sig = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest();
  return `${signingInput}.${b64url(sig)}`;
}

export async function GET(req: Request): Promise<NextResponse> {
  const secret =
    process.env.NEXT_PUBLIC_MOCK_JWT_SECRET ?? 'dev-only-shared-secret-rotate-in-prod';
  const platformUserId =
    process.env.NEXT_PUBLIC_MOCK_PLATFORM_USER_ID ?? 'USR61220651';
  const communityCode =
    process.env.NEXT_PUBLIC_MOCK_COMMUNITY_CODE ?? 'COM96179941';

  const url = new URL(req.url);
  const roleParam = url.searchParams.get('role');
  const role = (roleParam ?? process.env.NEXT_PUBLIC_MOCK_ROLE ?? 'OWNER').toUpperCase();

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: crypto.randomUUID(),
    platform_user_id: platformUserId,
    keycloak_user_id: crypto.randomUUID(),
    community_code: communityCode,
    org_id: 'be2064fc-9d31-47a9-9e08-646d1fd57f1d',
    roles: [role],
    type: 'COMMUNITY',
    iss: 'skep-api',
    iat: now,
    exp: now + 60 * 60,
  };

  return NextResponse.json({
    token: signJwt(payload, secret),
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    role: payload.roles[0],
    communityCode: payload.community_code,
    platformUserId: payload.platform_user_id,
  });
}
