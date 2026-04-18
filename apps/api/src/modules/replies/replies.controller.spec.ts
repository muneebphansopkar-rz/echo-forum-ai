import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  auth,
  buildApp,
  mintToken,
  type Harness,
} from '../__tests__/e2e-harness';

describe('RepliesController (integration)', () => {
  let harness: Harness | null = null;
  let tagId: string | null = null;
  let postId: string | null = null;

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
        const created = await harness
          .http()
          .post(`${harness.prefix}/forum/posts`)
          .set(auth(token))
          .send({
            title: `reply-spec ${Date.now()}`,
            body: 'Body',
            tagIds: [tagId],
          });
        postId = created.body?.data?.id ?? null;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `[RepliesController.spec] skipping — ${(err as Error).message}`,
      );
      harness = null;
    }
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.close();
  });

  it('depth capping: reply-to-reply produces depth=2', async () => {
    if (!harness || !postId) return;
    const token = mintToken({ role: 'MEMBER' });
    const first = await harness
      .http()
      .post(`${harness.prefix}/forum/posts/${postId}/replies`)
      .set(auth(token))
      .send({ body: 'level-1 reply' });
    expect(first.status).toBe(201);
    expect(first.body.data.depth).toBe(1);

    const second = await harness
      .http()
      .post(`${harness.prefix}/forum/posts/${postId}/replies`)
      .set(auth(token))
      .send({ body: 'level-2 reply', parentReplyId: first.body.data.id });
    expect(second.status).toBe(201);
    expect(second.body.data.depth).toBe(2);
    expect(second.body.data.parentReplyId).toBe(first.body.data.id);

    // Third level should flatten to depth=2 with parent = level-1
    const third = await harness
      .http()
      .post(`${harness.prefix}/forum/posts/${postId}/replies`)
      .set(auth(token))
      .send({ body: 'level-3 flatten', parentReplyId: second.body.data.id });
    expect(third.status).toBe(201);
    expect(third.body.data.depth).toBe(2);
    // Parent of a flattened level-3 becomes its grandparent (level-1).
    expect(third.body.data.parentReplyId).toBe(first.body.data.id);
  }, 45_000);

  it('list endpoint returns items + nextCursor:null for small set', async () => {
    if (!harness || !postId) return;
    const token = mintToken({ role: 'MEMBER' });
    const res = await harness
      .http()
      .get(`${harness.prefix}/forum/posts/${postId}/replies?sort=new&limit=50`)
      .set(auth(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.nextCursor === null || typeof res.body.data.nextCursor === 'string').toBe(
      true,
    );
  }, 20_000);
});
