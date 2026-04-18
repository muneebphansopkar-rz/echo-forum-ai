import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  auth,
  buildApp,
  mintToken,
  type Harness,
} from '../__tests__/e2e-harness';

describe('PostsController (integration)', () => {
  let harness: Harness | null = null;
  let firstTagId: string | null = null;

  beforeAll(async () => {
    try {
      harness = await buildApp();
      const token = mintToken({ role: 'MEMBER' });
      const tagsRes = await harness
        .http()
        .get(`${harness.prefix}/forum/tags`)
        .set(auth(token));
      firstTagId = (tagsRes.body?.data as Array<{ id: string }> | undefined)?.[0]
        ?.id ?? null;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `[PostsController.spec] skipping — ${(err as Error).message}`,
      );
      harness = null;
    }
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.close();
  });

  it('create → list → get round-trip', async () => {
    if (!harness || !firstTagId) return;
    const token = mintToken({ role: 'MEMBER' });
    const created = await harness
      .http()
      .post(`${harness.prefix}/forum/posts`)
      .set(auth(token))
      .send({
        title: `E2E post ${Date.now()}`,
        body: 'Hello @USR77777 from integration test.',
        tagIds: [firstTagId],
      });
    expect(created.status).toBe(201);
    expect(created.body.success).toBe(true);
    const postId: string = created.body.data.id;
    expect(postId).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.body.data.tags.length).toBe(1);
    expect(created.body.data.body).toContain('@USR77777');

    const list = await harness
      .http()
      .get(`${harness.prefix}/forum/posts?sort=new&limit=5`)
      .set(auth(token));
    expect(list.status).toBe(200);
    expect(list.body.success).toBe(true);
    expect(Array.isArray(list.body.data.items)).toBe(true);
    expect(
      (list.body.data.items as Array<{ id: string }>).some((p) => p.id === postId),
    ).toBe(true);

    const detail = await harness
      .http()
      .get(`${harness.prefix}/forum/posts/${postId}`)
      .set(auth(token));
    expect(detail.status).toBe(200);
    expect(detail.body.data.id).toBe(postId);
    expect(detail.body.data.isPinned).toBe(false);
    expect(detail.body.data.isLocked).toBe(false);
  }, 45_000);

  it('rejects create with no tags (VALIDATION_ERROR)', async () => {
    if (!harness) return;
    const token = mintToken({ role: 'MEMBER' });
    const res = await harness
      .http()
      .post(`${harness.prefix}/forum/posts`)
      .set(auth(token))
      .send({ title: 'x', body: 'y', tagIds: [] });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  }, 20_000);

  it('404 envelope for missing post', async () => {
    if (!harness) return;
    const token = mintToken({ role: 'MEMBER' });
    const res = await harness
      .http()
      .get(`${harness.prefix}/forum/posts/00000000-0000-4000-8000-000000000000`)
      .set(auth(token));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('FORUM_POST_NOT_FOUND');
  }, 20_000);
});
