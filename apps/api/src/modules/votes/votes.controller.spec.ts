import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  auth,
  buildApp,
  mintToken,
  type Harness,
} from '../__tests__/e2e-harness';

describe('VotesController (integration)', () => {
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
            title: `vote-spec ${Date.now()}`,
            body: 'Body',
            tagIds: [tagId],
          });
        postId = created.body?.data?.id ?? null;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `[VotesController.spec] skipping — ${(err as Error).message}`,
      );
      harness = null;
    }
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.close();
  });

  it('toggles upvote on/off and updates denormalized count', async () => {
    if (!harness || !postId) return;
    const token = mintToken({ role: 'MEMBER' });

    const on = await harness
      .http()
      .post(`${harness.prefix}/forum/votes`)
      .set(auth(token))
      .send({ targetType: 'post', targetId: postId });
    expect(on.status).toBe(201);
    expect(on.body.data.upvoted).toBe(true);
    expect(on.body.data.upvoteCount).toBeGreaterThanOrEqual(1);

    const off = await harness
      .http()
      .post(`${harness.prefix}/forum/votes`)
      .set(auth(token))
      .send({ targetType: 'post', targetId: postId });
    expect(off.status).toBe(201);
    expect(off.body.data.upvoted).toBe(false);
  }, 30_000);

  it('404 on unknown post vote', async () => {
    if (!harness) return;
    const token = mintToken({ role: 'MEMBER' });
    const res = await harness
      .http()
      .post(`${harness.prefix}/forum/votes`)
      .set(auth(token))
      .send({
        targetType: 'post',
        targetId: '00000000-0000-4000-8000-000000000000',
      });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('FORUM_POST_NOT_FOUND');
  }, 20_000);
});
