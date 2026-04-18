# @skep/web — SKEP Forum Frontend

Next.js 14 App Router UI for the SKEP Forum module. See
[apps/web/CONTEXT.md](./CONTEXT.md) for the full operating manual.

## Run

```bash
# one-time
cp .env.example .env.local

# loop
pnpm --filter @skep/web dev
```

Open http://localhost:3000 — it redirects to `/forum` (Hot feed).

## Layout

```
src/
├── app/
│   ├── (forum)/          # route group for feeds, thread, submit, search
│   ├── layout.tsx        # root — fonts + providers
│   ├── providers.tsx     # TanStack Query client
│   ├── error.tsx / loading.tsx / not-found.tsx
│   └── globals.css       # Tailwind + design tokens
├── components/
│   ├── ui/               # shadcn-style copies (Button, Card)
│   ├── forum/            # Feed, PostCard
│   └── forms/            # NewPostForm
├── hooks/                # use-mock-session, use-api-client, use-posts
└── lib/                  # api-client, query-keys, utils, zod schemas
```

## Deferred

- Real NextAuth/Keycloak integration (see `hooks/use-mock-session.ts`).
- Thread view replies + upvote mutations.
- Tag picker with typeahead.
- Markdown preview in composer.
- Search suggestions + results.
