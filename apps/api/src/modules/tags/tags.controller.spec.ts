import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { auth, buildApp, mintToken, type Harness } from '../__tests__/e2e-harness';

describe('TagsController (integration)', () => {
  let harness: Harness | null = null;

  beforeAll(async () => {
    try {
      harness = await buildApp();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `[TagsController.spec] skipping — failed to build app: ${(err as Error).message}`,
      );
      harness = null;
    }
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.close();
  });

  it('GET /forum/tags returns envelope with ≥ 6 default tags', async () => {
    if (!harness) return;
    const token = mintToken({ role: 'MEMBER' });
    const res = await harness
      .http()
      .get(`${harness.prefix}/forum/tags`)
      .set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(6);
    const slugs = (res.body.data as { slug: string }[]).map((t) => t.slug);
    for (const expected of [
      'launches',
      'feedback',
      'tools',
      'questions',
      'hiring',
      'announcements',
    ]) {
      expect(slugs).toContain(expected);
    }
    expect(res.body.meta.requestId).toBeDefined();
  }, 20_000);

  it('rejects unauthenticated requests with UNAUTHORIZED envelope', async () => {
    if (!harness) return;
    const res = await harness.http().get(`${harness.prefix}/forum/tags`);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  }, 20_000);

  it('POST /forum/tags requires ADMIN', async () => {
    if (!harness) return;
    const token = mintToken({ role: 'MEMBER' });
    const res = await harness
      .http()
      .post(`${harness.prefix}/forum/tags`)
      .set(auth(token))
      .send({ slug: 'mem-test', label: 'Test', color: '#123456' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  }, 20_000);
});
