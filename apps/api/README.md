# @skep/api — SKEP Forum Backend

NestJS 10 service that powers the SKEP Forum module. See
[apps/api/CONTEXT.md](./CONTEXT.md) for the full operating manual.

## Run

```bash
# one-time
cp .env.example .env
make dev-infra         # from repo root — starts Postgres + Redis

# loop
pnpm --filter @skep/api dev
```

The server boots on `:3001` under the prefix `/api/v1`. Health check:
`GET /api/v1/health`.

## Layout

```
src/
├── main.ts               # bootstrap
├── app.module.ts
├── config/               # zod-validated env at startup
├── common/               # filters, decorators, pagination helpers
├── auth/                 # mock JWT guard (Keycloak swap-point)
├── tenancy/              # schema-per-community resolver
├── events/               # Redis bus publisher
├── health/               # liveness probe
└── posts/                # scaffolded feature module
```

## Deferred

- Real Keycloak integration (see `auth/mock-jwt.guard.ts`).
- Entity classes + repositories (see `posts/entities/` placeholder).
- Replies, upvotes, tags, feeds, moderation, search feature modules.
