# Frontend Context — apps/web

> Scoped operating manual for the Frontend Dev agent.
> Load this INSTEAD of the full CLAUDE.md when working inside apps/web/.
> Source-of-truth files this relies on — read them if referenced:
> `project/TECH-STACK.md` · `project/CONSTRAINTS.md` · `project/BRIEF.md`
> · `project/DESIGN-SYSTEM.json` · `docs/ARCHITECTURE.md`
> · `.claude/skills/ui-intelligence/SKILL.md` (severity: hard).

---

## Product: SKEP Forum (Web)

Next.js 14 App Router frontend for a threaded async forum. Members post,
reply (up to 2 levels), upvote, tag, and search — inside their own
SKEP community only.

UI density target: **Lobste.rs calm** — not Reddit maximalism. Threaded
reply UX reference: **old.reddit.com**.

---

## Scope — What This Agent Owns

```
apps/web/src/           # all Next.js code
apps/web/public/        # static assets
apps/web/package.json
apps/web/tsconfig.json
apps/web/tailwind.config.ts
apps/web/next.config.ts
```

**Do not touch:** `apps/api/`, `packages/shared/` (coordinate via Architect
for shared Zod schemas), `infra/`, `.github/`.

---

## Stack Locks (from TECH-STACK.md)

| Layer | Choice | Rule |
|---|---|---|
| Framework | Next.js 14 App Router | **Not** Pages Router |
| Language | TypeScript 5.x strict | No `any`, no `@ts-ignore` |
| UI | shadcn/ui + Radix | Copy-owned components in `src/components/ui/` |
| Styling | Tailwind 3.x | Use design tokens — no raw hex |
| Icons | Lucide React | One decorative icon per section max |
| Server state | TanStack Query 5.x | **All** API data — no `useEffect` for fetching |
| Client state | Zustand 4.x | Client-only state (UI modals, drafts) |
| Forms | React Hook Form 7.x + Zod resolver | Every form |
| Validation | Zod 3.x | Shared schemas with backend |
| Dates | date-fns 3.x | No Moment.js |
| Auth | Mock session (dev) | Real NextAuth/Keycloak integration deferred |

---

## App Router Layout

```
apps/web/src/
├── app/
│   ├── (forum)/             # route group — forum (mock-auth in dev)
│   │   ├── layout.tsx       # mock-session shell; real guard added with auth integration
│   │   ├── page.tsx         # Hot feed (default)
│   │   ├── new/page.tsx     # New feed
│   │   ├── top/page.tsx     # Top feed
│   │   ├── p/[postId]/page.tsx  # post detail + replies
│   │   ├── submit/page.tsx  # create post
│   │   └── search/page.tsx
│   ├── api/                 # Next route handlers (auth callbacks ONLY)
│   ├── layout.tsx           # root layout + providers
│   └── error.tsx / not-found.tsx / loading.tsx
├── components/
│   ├── ui/                  # shadcn copies — do not import from @shadcn/ui
│   ├── forum/               # PostCard, ReplyTree, UpvoteButton, TagPill
│   └── forms/               # NewPostForm, NewReplyForm
├── hooks/
│   ├── use-mock-session.ts  # dev-only mock session (swap for real auth later)
│   ├── use-posts.ts         # TanStack Query wrappers
│   └── use-toast.ts
├── lib/
│   ├── api-client.ts        # fetch wrapper — handles { code, message, statusCode }
│   ├── query-keys.ts        # centralized key factory
│   ├── utils.ts             # cn(), formatters
│   └── zod/                 # shared schemas
└── styles/globals.css
```

---

## Server vs Client Components

**Default: Server Component.** Add `'use client'` only when you need:
- Hooks (`useState`, `useEffect`, TanStack Query, RHF)
- Event handlers (`onClick`, `onChange`)
- Browser-only APIs (`window`, `localStorage`)
- Zustand store subscriptions

**Page-level rule:** data-fetching pages are server components — they
prefetch via `queryClient.prefetchQuery` and hydrate into TanStack.
Interactive fragments (upvote button, reply form) are small client islands.

---

## Data Fetching — TanStack Query

- **Never** `useEffect(fetch)`. Always `useQuery` / `useMutation`.
- Query keys come from `lib/query-keys.ts`:
  ```ts
  export const qk = {
    posts: {
      feed: (feed: 'hot' | 'new' | 'top', cursor?: string) => ['posts', feed, cursor] as const,
      detail: (id: string) => ['posts', id] as const,
      replies: (postId: string) => ['posts', postId, 'replies'] as const,
    },
    me: () => ['me'] as const,
  };
  ```
- Mutations invalidate precisely — never `queryClient.invalidateQueries()` bare.
- Optimistic upvote/reply updates are expected — roll back on error.

---

## Form Pattern (every form)

```tsx
const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
  defaultValues: {...},
});
const onSubmit = form.handleSubmit((values) => mutation.mutate(values));
```

- Schema lives in `lib/zod/` and is shared with backend.
- Submit button disabled during `mutation.isPending`.
- Surface server error `code` → friendly message via a small switch in the form.

---

## Auth — Mock Session (deferred integration)

**Authentication is NOT in scope for this module build.** SKEP already
has an auth layer; real integration is a later phase.

For this build:
- `use-mock-session.ts` returns a fixed `{ userId, communityId, role }`
  and injects a **mock JWT** into `api-client.ts` on every request.
- Do NOT build login/register pages, NextAuth config, refresh logic,
  or password UI.
- Keep the session hook's return shape stable so the later swap to
  NextAuth is a one-file change.
- If asked to build real auth UI, pause and confirm — it is explicitly deferred.

---

## Error Handling

`api-client.ts` normalizes every error to:

```ts
class ApiError extends Error {
  code: string;
  statusCode: number;
}
```

Components render from `code`, not `message`, so copy can be tuned
without changing backend. Every page has `error.tsx`. Every async UI
region has a loading skeleton.

---

## UI Critical Rules — `ui-intelligence` (severity: hard)

These block the handoff. Load the skill before writing **any** JSX/TSX.

1. No gradient backgrounds on layout regions.
2. No glassmorphism (`backdrop-blur` + translucent bg).
3. No `rounded-2xl` / `rounded-3xl` on containers — **`rounded-lg` max**.
4. No gradient CTAs — use `bg-primary` token.
5. No floating stat-card grids — use inline stat rows.
6. No icon badge overload — **max one** decorative icon per section.
7. No hero glow blobs.
8. No icon-only sidebar — always label navigation.
9. `cn()` from `lib/utils` — never string-concatenate classNames.
10. Design tokens from `project/DESIGN-SYSTEM.json` — never raw hex.

`ui_audit` block must be in the task log with `overall: pass` before
handoff. Reference product targets: **Lobste.rs** (density), **old.reddit.com** (threads).

---

## Performance Targets (from CONSTRAINTS.md)

- LCP < 2.5s (blocks ship).
- Server components + streaming for above-the-fold.
- Images via `next/image` — no raw `<img>`.
- Prefetch feed on hover for perceived instant nav.

---

## Testing Rules

- Component tests: Vitest + React Testing Library.
- E2E: Playwright — cover login → post → reply → upvote golden path.
- TanStack Query tests use a fresh `QueryClient` per test — no shared cache.
- Load `tdd-workflow` before any hook/component logic.

---

## Skill Load Order (Frontend Dev)

For every task in apps/web/:
1. `ui-intelligence` — **first, always** (severity: hard).
2. `workflow-ship-faster`.
3. `frontend-patterns` — structure and data-fetching rules.
4. `tdd-workflow` — for hooks and logic.
5. `systematic-debugging` — on bugs.
6. `adversarial-review` — before handoff.
7. `git-workflow` — before every commit.
