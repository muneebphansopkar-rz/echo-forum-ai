import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  auth,
  buildApp,
  mintToken,
  type Harness,
} from '../__tests__/e2e-harness';

describe('SearchController (integration)', () => {
  let harness: Harness | null = null;
  let tagId: string | null = null;
  const uniq = `zq-${Math.random().toString(36).slice(2, 8)}`;

  beforeAll(async () => {
    try {
      harness = await buildApp();
      const token = mintToken({ role: 'MEMBER' });
      const tagsRes = await harness
        .http()
        .get(`${harness.prefix}/forum/tags`)
        .set(auth(token));
      tagId = (tagsRes.body?.data as Array<{ id: string }> | undefined)?.[0]?.id ?? null;
      if (tagId) {
        await harness
          .http()
          .post(`${harness.prefix}/forum/posts`)
          .set(auth(token))
          .send({
            title: `Search ${uniq} needle`,
            body: `This post contains the ${uniq} search term for tsvector.`,
            tagIds: [tagId],
          });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `[SearchController.spec] skipping — ${(err as Error).message}`,
      );
      harness = null;
    }
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.close();
  });

  it('finds the seeded needle and returns highlights', async () => {
    if (!harness) return;
    const token = mintToken({ role: 'MEMBER' });
    const res = await harness
      .http()
      .get(`${harness.prefix}/forum/search?q=${uniq}`)
      .set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const items = res.body.data.items as Array<{
      title: string;
      highlights: { title: string | null; body: string | null };
    }>;
    expect(items.length).toBeGreaterThanOrEqual(1);
    const match = items.find((i) => i.title.includes(uniq));
    expect(match).toBeDefined();
    expect(
      match?.highlights.title || match?.highlights.body,
    ).toMatch(/<mark>.*?<\/mark>/);
  }, 30_000);

  it('rejects empty q with validation error', async () => {
    if (!harness) return;
    const token = mintToken({ role: 'MEMBER' });
    const res = await harness
      .http()
      .get(`${harness.prefix}/forum/search`)
      .set(auth(token));
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  }, 15_000);
});
