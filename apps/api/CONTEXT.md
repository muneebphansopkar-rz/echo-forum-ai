# Backend Context — apps/api

> Scoped operating manual for the Backend Dev agent.
> Load this INSTEAD of the full CLAUDE.md when working inside apps/api/.
> Source-of-truth files this relies on — read them if referenced:
> `project/TECH-STACK.md` · `project/CONSTRAINTS.md` · `project/BRIEF.md`
> · `project/REQUIREMENTS.md` · `docs/ARCHITECTURE.md`.

---

## Product: SKEP Forum

Threaded async forum for SKEP communities. This backend is the **Forum
module** — a NestJS service emitting domain events to a Redis bus.

**Non-negotiable product constraints** (extend `project/CONSTRAINTS.md`):
- Strict tenancy — schema-per-community, **zero cross-schema joins**.
- Emits domain events, never sends notifications directly.
- Reply nesting capped at 2 levels — 3rd-level replies flatten to level 2.

## Auth — Mock JWT (deferred integration)

**Authentication is NOT in scope for this module build.** The SKEP
platform already has an auth layer (Keycloak); real integration is a
later phase.

For this build:
- Use a **mock JWT guard** that accepts any dev-signed token and
  populates `@CurrentUser()` with `{ userId, communityId, role }`.
- Do NOT build Passport strategies, login/register endpoints, refresh
  flows, or password handling in this module.
- Keep the guard/decorator interface stable so the later Keycloak
  integration is a one-file swap.
- If asked to build real auth, pause and confirm — it is explicitly deferred.

---

## Scope — What This Agent Owns

```
apps/api/src/          # all NestJS code
apps/api/test/         # all backend tests
apps/api/package.json
apps/api/tsconfig.json
apps/api/nest-cli.json
```

**Do not touch:** `apps/web/`, `packages/shared/` (coordinate via Architect
for shared Zod schemas), `infra/`, `.github/`.

---

## Stack Locks (from TECH-STACK.md)

| Layer | Choice | Rule |
|---|---|---|
| Framework | NestJS 10 | Feature modules per domain |
| Language | TypeScript 5.x strict | No `any`, no `@ts-ignore` |
| ORM | TypeORM 0.3.x | Repository pattern **only** |
| DB | PostgreSQL 16 | Schema-per-community tenancy |
| Validation | class-validator + class-transformer | Every DTO |
| Auth | Mock JWT guard (dev) | Real Keycloak/Passport integration deferred |
| Queue | BullMQ 5.x | When background jobs needed |
| Cache / Bus | Redis 7.x | Domain events published here |
| Tests | Vitest + supertest | Integration tests hit a real DB |
| Search | Postgres `tsvector` + GIN | No Meilisearch / Typesense |
| Markdown | remark + rehype-sanitize | Server-side sanitization |

---

## Module Layout

Every feature is a NestJS module. Keep them thin and self-contained.

```
apps/api/src/
├── app.module.ts
├── main.ts
├── config/                  # env loader + zod-validated config
├── common/
│   ├── decorators/          # @CurrentUser(), @Tenant()
│   ├── filters/             # HttpExceptionFilter → { code, message, statusCode }
│   ├── guards/              # JwtAuthGuard, RolesGuard
│   ├── interceptors/        # logging, response shaping
│   ├── pagination/          # cursor helpers
│   └── events/              # Redis bus publisher
├── auth/                    # MOCK JWT guard + @CurrentUser() decorator (real auth deferred)
├── tenancy/                 # schema resolution per request
├── posts/
│   ├── dto/                 # request + response DTOs (separate files)
│   ├── entities/            # @Entity classes
│   ├── posts.controller.ts
│   ├── posts.service.ts
│   ├── posts.repository.ts  # custom repository — no direct entity access in service
│   └── posts.module.ts
├── replies/
├── upvotes/
├── tags/
├── feeds/                   # Hot / New / Top query builders
├── moderation/              # pin, lock, hide
├── search/                  # tsvector queries
└── events/                  # outbound Redis publisher
```

---

## Critical Rules — Do Not Break

1. **userId always from JWT** via `@CurrentUser()` — **never** from request body or query.
2. **DTO in, DTO out** — never return entities from controllers. Response DTOs only.
3. **Repository pattern** — services depend on custom repositories, not `Repository<T>` directly.
4. **Cursor pagination** on every list endpoint — offset pagination drifts on live data.
5. **No N+1** — use `QueryBuilder` joins or explicit `relations` with measured queries.
6. **Soft delete** via `@DeleteDateColumn` — never hard-delete user data.
7. **Tenant resolution** happens in a guard/interceptor — services assume the schema is already set.
8. **Secrets from env** — validated at startup by the config module. App refuses to start if required vars missing.
9. **Rate limit** every public endpoint (`@Throttle()` decorator).
10. **Never log** tokens, passwords, or PII.

---

## Error Response Contract

Every HTTP error exits through `HttpExceptionFilter` and matches:

```json
{
  "code": "POST_NOT_FOUND",
  "message": "Post not found in this community",
  "statusCode": 404
}
```

- `code` — SCREAMING_SNAKE, domain-prefixed, stable (frontend switches on it).
- `message` — plain English, user-safe, no stack traces.
- `statusCode` — matches HTTP status.

Throw NestJS built-ins (`NotFoundException`, `ForbiddenException`, etc.) with a
`{ code, message }` payload — the filter normalizes the rest.

---

## Pagination Contract

All list endpoints return:

```json
{
  "items": [...],
  "nextCursor": "eyJpZCI6IjEyMyJ9" | null
}
```

Cursor encodes `{ id, createdAt }` (or the sort-key tuple) as base64 JSON.
Default page size: 20. Max: 50. Client sends `?cursor=...&limit=20`.

---

## Domain Events (Redis bus)

Publish via `events.publish(name, payload)`. Payload must be self-contained
(downstream consumers won't call back into the forum API).

| Event | Payload shape | When |
|---|---|---|
| `forum.post.created` | `{ postId, communityId, authorId, tags }` | After commit on post create |
| `forum.reply.added` | `{ replyId, postId, parentReplyId, communityId, authorId, mentions: string[] }` | After commit on reply create |
| `forum.post.upvoted` | `{ postId, communityId, voterId }` | After commit on upvote insert (not on toggle-off) |

**Always publish AFTER the DB transaction commits** — not inside it.

---

## Testing Rules (ties to CONSTRAINTS.md)

- **Integration tests hit a real Postgres** — no mocking the DB.
- Use Vitest + supertest. One test file per controller.
- Seed per-test via transaction + rollback (`DataSource.transaction`) where possible.
- Coverage floors: overall > 60%, auth flows 100%, data-deletion 100%.
- Load `tdd-workflow` skill before writing any service/repo logic —
  RED → GREEN → REFACTOR, test first.

---

## Handoff to Frontend Dev

When an endpoint or set of endpoints is complete, write the handoff to
`logs/decisions/handoff-{slug}.md` with:

- Every endpoint — method, path, request DTO, response DTO, auth requirement.
- Error `code` values the frontend should handle.
- Any query-param / cursor contract details.
- Read-only file pointers: `apps/api/src/{feature}/dto/` and `entities/`.
- `ACK_REQUIRED: yes` — do not start frontend work until ACK is logged.

Run `adversarial-review` before the handoff. `security-review` is mandatory
before any auth, payment, or data-mutation handoff.

---

## Skill Load Order (Backend Dev)

For every task in apps/api/:
1. `workflow-ship-faster` — always first.
2. `backend-patterns` — enforces module/DTO/repo structure.
3. `api-design` — contract-first, before endpoint code.
4. `tdd-workflow` — for any testable logic (services, repos, guards).
5. `security-review` — before auth/payment/data-mutation.
6. `systematic-debugging` — on bugs.
7. `adversarial-review` — before handoff.
8. `git-workflow` — before every commit.
