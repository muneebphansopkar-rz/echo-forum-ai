# Constraints

> Hard limits Claude must never violate regardless of what seems faster or easier.
> These are non-negotiable. If a constraint conflicts with a skill rule,
> the more restrictive one wins.
> To change a constraint, update this file and re-run /plan.

---

## Scope Constraints

### MVP Definition

Members of a SKEP community can post, reply (up to 2 levels nesting),
upvote, tag, and full-text search within their own community's forum.
Moderators can pin, lock, and hide. The Hot / New / Top feeds work and
are cursor-paginated. Mentions and replies emit events consumed by
Campaigns for notifications. Tenant isolation is absolute — schema per
community, no cross-schema joins. Module validates SKEP JWTs; never
issues them. Module emits domain events but never sends notifications
directly.

### Explicitly Out of Scope
<!--
Claude will not implement these even if asked mid-build.
To add something, update this file and re-run /plan.
See also module-briefs/echo-forum/CONSTRAINTS.md for forum-specific
out-of-scope items that extend this list.
-->
- [ ] Reputation / karma scores
- [ ] Accepted-answer semantics
- [ ] Public (unauthenticated) read access
- [ ] Polls inside posts
- [ ] Multi-community aggregated feeds
- [ ] Nesting beyond 2 levels
- [ ] Post scheduling
- [ ] Server-side thread summaries (future Tutor integration)
- [ ] Raw HTML in post bodies — Markdown only
- [ ] WYSIWYG editor (no tiptap, no slate)
- [ ] External search engines (no Meilisearch, no Typesense)

---

## Technical Constraints

### Stack Locks
<!-- Derived from project/TECH-STACK.md. Changes require updating both files and re-running /plan. -->
| Layer | Choice | Version | Locked? |
|---|---|---|---|
| Language | TypeScript (strict) | 5.x | Yes |
| Backend | NestJS | 10 | Yes |
| Frontend | Next.js App Router | 14 | Yes |
| Database | PostgreSQL | 16 | Yes |
| ORM / Data | TypeORM (repository pattern) | 0.3.x | Yes |
| Test runner | Vitest (unit/integration) + Playwright (E2E) | latest | Yes |
| UI | shadcn/ui + Tailwind 3.x | latest | Yes |
| Server state | TanStack Query | 5.x | Yes |
| Auth | Passport JWT (validate only — never issue) | latest | Yes |
| Cache / Queue | Redis + BullMQ | 7.x / 5.x | Yes |
| Markdown | remark + remark-gfm + rehype-sanitize (server-side) | latest | Yes |
| Search | Postgres `tsvector` + GIN index | — | Yes |
| Package manager | pnpm workspaces | 9.x | Yes |

### Performance Constraints
| Metric | Target | On miss |
|---|---|---|
| Page load LCP | < 2.5s | Block ship |
| API p95 response | < 300ms | Log warning |
| DB query time | < 100ms | Log warning |

### Security Constraints
- No secrets in code — always env vars
- No hardcoded user IDs — always from auth context
- No raw SQL — always ORM or parameterized queries
- All endpoints behind auth guard unless explicitly marked public
- Rate limiting on all public endpoints
- Password hashing: bcrypt (cost >= 12) or argon2

### Dependency Constraints
<!-- Libraries that cannot be added without explicit approval -->
- No dependencies with known critical CVEs
- No dependencies > 500KB unpacked without logged justification

---

## Quality Gate Thresholds

Claude runs these checks before every deploy. All must pass.

| Check | Threshold | On fail |
|---|---|---|
| Compilation / type errors | 0 | Block ship |
| Lint errors | 0 | Block ship |
| Test coverage — overall | > 60% | Block ship |
| Test coverage — auth flows | 100% | Block ship |
| Test coverage — payment flows | 100% | Block ship |
| Test coverage — data deletion | 100% | Block ship |
| Security scan (OWASP) | 0 critical, 0 high | Block ship |
| Production build | Successful | Block ship |

---

## Timeline Constraints

- MVP deadline: Hackathon T+72h (T+0 to be confirmed by user)
- Hard external deadline: Hackathon demo (same as T+72h)
- Key milestones: T+6h auth smoke-test · T+18h post/reply working
  · T+36h upvote + sorting · T+54h mentions + search + moderation
  · T+72h demo

---

## Things Claude Must ALWAYS Do

- Create the log file BEFORE starting any task
- Ask before adding any new external dependency
- Wait for `/approve` at every stage gate
- Run `adversarial-review` before every agent handoff
- Write to `MEMORY.md` at session end
- Run `security-review` before any auth, payment, or data mutation code
- Emit skill self-audit YAML in every deliverable

## Things Claude Must NEVER Do

- Start a task without creating the log file first
- Advance past a stage gate without `/approve`
- Add a library not in `TECH-STACK.md` without asking first
- Hardcode any value that should be an env var
- Commit directly to `main`
- Ship with failing tests
- Return entity/model objects directly from API (always use response DTOs)
- Store passwords in plaintext
- Log sensitive data (tokens, passwords, PII)
