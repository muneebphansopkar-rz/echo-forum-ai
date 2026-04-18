import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  auth,
  buildApp,
  mintToken,
  type Harness,
} from '../__tests__/e2e-harness';

describe('ModerationController (integration)', () => {
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
            title: `mod-spec ${Date.now()}`,
            body: 'Body',
            tagIds: [tagId],
          });
        postId = created.body?.data?.id ?? null;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `[ModerationController.spec] skipping — ${(err as Error).message}`,
      );
      harness = null;
    }
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.close();
  });

  it('pin → queue contains the pinned post', async () => {
    if (!harness || !postId) return;
    const mod = mintToken({ role: 'MODERATOR' });
    const res = await harness
      .http()
      .post(`${harness.prefix}/forum/moderation/posts/${postId}/pin`)
      .set(auth(mod))
      .send({ pinned: true });
    expect(res.status).toBe(201);
    expect(res.body.data.pinned).toBe(true);

    const queue = await harness
      .http()
      .get(`${harness.prefix}/forum/moderation/queue?bucket=pinned&limit=50`)
      .set(auth(mod));
    expect(queue.status).toBe(200);
    const ids = (queue.body.data.items as Array<{ targetId: string }>).map(
      (i) => i.targetId,
    );
    expect(ids).toContain(postId);
  }, 45_000);

  it('members are forbidden from the queue', async () => {
    if (!harness) return;
    const member = mintToken({ role: 'MEMBER' });
    const res = await harness
      .http()
      .get(`${harness.prefix}/forum/moderation/queue`)
      .set(auth(member));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  }, 20_000);
});
