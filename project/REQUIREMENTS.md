# Requirements — SKEP Forum

> Functional requirements for the SKEP Forum module.
> Sourced from `module-briefs/echo-forum/REQUIREMENTS.md` on 2026-04-18.
> Format: MoSCoW — Must Have, Should Have, Could Have, Won't Have.

---

## Must Have — MVP (ships in this build)

### Authentication & Users

- [ ] All endpoints under `/api/v1/forum` require a valid SKEP JWT.
- [ ] `MEMBER`+ can read, post, reply, and upvote.
- [ ] `MODERATOR`+ can hide replies and pin/lock posts.
- [ ] `ADMIN`+ can manage tags (create, rename, archive).
- [ ] `OWNER` can configure forum settings (edit window, max post length).

### Core Feature: Posts

- [ ] `POST /api/v1/forum/posts` creates a post with `title` (≤ 200 chars),
      `body` (Markdown, ≤ 10,000 chars), and at least one `tag_id`.
- [ ] `GET /api/v1/forum/posts?feed=hot|new|top&tag=...&cursor=...` returns
      a cursor-paginated feed.
- [ ] `GET /api/v1/forum/posts/:id` returns a post with all its replies
      (nested) and counts.
- [ ] `PATCH /api/v1/forum/posts/:id` updates a post within a 15-minute
      edit window from creation (author only).
- [ ] Soft-delete via `DELETE /api/v1/forum/posts/:id` (author or
      `MODERATOR`+).

### Core Feature: Replies

- [ ] `POST /api/v1/forum/posts/:id/replies` creates a reply.
- [ ] Supports one level of nesting: a reply may target another reply by
      `parent_reply_id`. A reply to a level-2 reply flattens to level-2.
- [ ] Same 15-minute edit window as posts.
- [ ] Soft-delete.

### Core Feature: Upvotes

- [ ] `POST /api/v1/forum/posts/:id/upvote` — idempotent: calling again
      does nothing. `DELETE` on same path removes the vote.
- [ ] `POST /api/v1/forum/replies/:id/upvote` — same semantics.
- [ ] Upvote counts are materialized on the post/reply row and updated
      transactionally with the vote insert/delete.

### Core Feature: Tags

- [ ] Community has a list of tags. Tag creation requires `ADMIN`+.
- [ ] `GET /api/v1/forum/tags` lists active tags for the community.
- [ ] A post must have at least one tag, max three.
- [ ] Filter feed by tag via `?tag=tagSlug`.

### Core Feature: Feeds & Sorting

- [ ] **New** — reverse chronological by `created_at`.
- [ ] **Top** — highest `upvote_count` in window (`today`, `week`, `all`).
- [ ] **Hot** — scored by
      `(upvote_count) / (hours_since_created + 2)^1.5`. Recomputed on
      read for MVP (optimize later if slow).

### Core Feature: Mentions

- [ ] Render `@platformUserId` in post/reply body as a link when the ID
      exists in the caller's community.
- [ ] On save, emit one `forum.mention` event per mentioned user
      (Campaigns converts these into notifications).

### Core Feature: Moderation

- [ ] `POST /api/v1/forum/posts/:id/pin` / `unpin` — `MODERATOR`+. Pinned
      posts appear at the top of every feed within the community.
- [ ] `POST /api/v1/forum/posts/:id/lock` / `unlock` — `MODERATOR`+.
      Locked posts reject new replies with `FORUM_POST_LOCKED`.
- [ ] `POST /api/v1/forum/replies/:id/hide` — `MODERATOR`+. Hidden
      replies show a placeholder to non-authors; the author still sees
      the original.
- [ ] Moderation actions emit `forum.moderation.action` events with
      `action`, `actorId`, `targetId`, `reason` (free text, optional).

### Core Feature: Search

- [ ] `GET /api/v1/forum/search?q=...` uses Postgres `tsvector` on post
      `title + body`.
- [ ] Results are cursor-paginated, ranked by `ts_rank`.
- [ ] Scoped to the caller's community schema only.

### Data & Storage

- [ ] Tables per community schema: `forum_tags`, `forum_posts`,
      `forum_replies`, `forum_votes`, `forum_post_tags`,
      `forum_mentions`, `forum_moderation_actions`.
- [ ] `forum_posts` has a generated `search_vector tsvector` column
      (from title + body) with a GIN index.
- [ ] Denormalized `upvote_count`, `reply_count` on posts;
      `upvote_count` on replies.

### API

- [ ] All endpoints under `/api/v1/forum` follow the SKEP response
      envelope (see `project/SKEP-INTEGRATION.md`).
- [ ] Cursor pagination on every list endpoint — never offset.
- [ ] Error codes follow `FORUM_*` naming (module-specific) or the
      shared code set (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, etc).

### Domain Events (emitted to Redis bus)

- [ ] `forum.post.created`
- [ ] `forum.reply.added`
- [ ] `forum.post.upvoted`
- [ ] Plus `forum.reply.upvoted`, `forum.mention`,
      `forum.moderation.action` — useful for Campaigns.

### UI / UX

- [ ] Feed page at `apps/web/app/modules/forum/` with sort tabs and tag
      filter.
- [ ] Post detail page with threaded replies.
- [ ] Composer with Markdown editor + preview.
- [ ] Tag selector (multi, typeahead).
- [ ] Upvote arrow with count, filled when the caller has voted.
- [ ] Moderator toolbar on posts/replies for `MODERATOR`+.
- [ ] Search bar with live suggestions as you type.
- [ ] Pinned posts visually distinct (badge + always-on-top in feed).

### Notifications (integration)

- [ ] `forum.reply.added` triggers Campaigns to notify the post author.
- [ ] `forum.mention` triggers Campaigns to notify mentioned users.
- [ ] Neither is built in Forum — Forum only emits events. Campaigns
      delivers.

---

## Should Have — Include if time allows

- [ ] Reply quoting (when replying, pre-fill with `> quoted text`).
- [ ] Saved posts (user can bookmark; list at `/saved`).
- [ ] Report reply / post → creates a moderator-visible flag row.
- [ ] Rich text images (embedded via Markdown with R2-backed uploads).
- [ ] Draft autosave on composer.

---

## Could Have — Future consideration, do not build now

- [ ] Deeper nesting (3+ levels).
- [ ] Accepted-answer marking.
- [ ] Post scheduling (publish later).
- [ ] Cross-community meta-forum.
- [ ] Polls inside posts.

---

## Won't Have — Explicitly out of scope

- [ ] Multi-community feeds.
- [ ] Public (unauthenticated) forum access.
- [ ] Arbitrary HTML in posts — Markdown only.
- [ ] Server-side LLM summaries of threads (future, via the Tutor
      module).
- [ ] Reputation scores / karma.

---

## User Stories

- As a **member**, I want to post a question and get answers, so that my
  problem gets solved by the community.
- As a **member**, I want to upvote useful replies, so that the best
  answer surfaces.
- As a **member**, I want to `@mention` a friend, so that they see the
  conversation.
- As a **moderator**, I want to lock a heated thread, so that it stops
  generating noise.
- As a **community owner**, I want to pin an important post, so that new
  members see it first.

---

## Non-Functional Requirements

### Performance

- Feed page API: < 250ms p95 for 20 posts.
- Post detail with 50 replies: < 300ms p95.
- Search: < 400ms p95 for a community with up to 10,000 posts.
- Upvote round-trip: < 150ms p95.
- Hot score recompute on read: < 100ms overhead.

### Security

- Authentication strategy: validate SKEP JWTs (issued by main platform
  via Keycloak); Forum never issues tokens.
- Data encrypted at rest: managed PostgreSQL (Railway) default-on
  encryption; no module-level field encryption required.
- Compliance: none at MVP.
- Markdown rendered server-side with `rehype-sanitize` (no raw HTML in
  output).
- `@mentions` matched case-insensitively against community membership.
- Rate limits: post creation 30/day per user; replies 200/day per user;
  upvote burst cap 60/minute per user.
- Tag ceiling: 20 tags per community for MVP.

### Accessibility

- Target: WCAG 2.1 AA.
- Full keyboard navigation through feeds and threads.
- Upvote controls have text labels for screen readers, not just arrows.

### Browser & Platform Support

- Chrome, Safari, Edge, Firefox — last 2 major versions each.
- Mobile responsive (no native app).

### Availability

- Acceptable downtime: hackathon-grade (no SLA); best effort.
- Backup / disaster recovery: Railway-managed PostgreSQL daily snapshot
  is sufficient for MVP.

---

## Acceptance Criteria

- [ ] All 7 items in `project/SKEP-INTEGRATION.md § Hackathon Definition
      of Done` pass.
- [ ] A member can: browse feed → create a post with tags → see it
      appear in New → receive a reply → upvote it → see the Hot ordering
      change.
- [ ] A `MODERATOR` can hide a reply; the author sees the original,
      others see a placeholder.
- [ ] A search for a word present in multiple posts returns ranked
      results within the community only.
- [ ] All three required domain events (plus the mention event) appear
      on the bus during the demo flow.
- [ ] A user in Community A cannot read, vote on, or search posts in
      Community B.
