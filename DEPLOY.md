# Deploy

`une.haus` is deploy-agnostic. Production lives in the homelab repo
(`~/Dev/homelab`) as the `unehaus` Ansible role — native Bun + systemd,
no container runtime. This file documents the build/run contract a host
must satisfy.

## Build

```bash
bun install --frozen-lockfile
bun run build:web
bun run build:docs
```

Each produces a `.output/` directory under its workspace
(`apps/web/.output`, `apps/docs/.output`).

## Start

From the repo root (so Bun resolves the workspace):

```bash
bun run start:web    # apps/web — port 3000 (PORT to override)
bun run start:docs   # apps/docs — port 3001 (PORT to override)
```

In production, each is its own systemd unit
(`unehaus-web.service` / `unehaus-docs.service`) reading
`/etc/unehaus/.env` via `EnvironmentFile=`.

## Required environment

See `apps/web/.env.example` for the authoritative list; the validator
lives in `apps/web/src/lib/env.ts`.

| Var                                                            | Notes                      |
| -------------------------------------------------------------- | -------------------------- |
| `DATABASE_URL`                                                 | Postgres connection string |
| `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_IMAGES_EDITOR_API_TOKEN` |                            |
| `GOOGLE_API_KEY`                                               | Maps                       |
| `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET` / `MUX_WEBHOOK_SECRET`     | Video                      |
| `RESEND_API_KEY`                                               | Email                      |
| `SESSION_SECRET`                                               | Cookie signing             |
| `VITE_ENVIRONMENT`                                             | `production` in prod       |
| `SENTRY_*`                                                     | Optional                   |
| `LOG_SQL`                                                      | Optional                   |

In the homelab, these are rendered to `/etc/unehaus/.env` by the
`unehaus` role from `ansible-vault`-encrypted secrets — they don't live
in this repo.

Two optional observability vars are injected directly by the systemd unit
(not the `.env`): `SERVICE_NAME` and `GIT_COMMIT`. The structured logger and
boot log stamp them onto every line so Loki can attribute logs to a service
and release. Both are absent in local dev. See `apps/web/docs/logging.md`.

## Local dev

```bash
docker compose up -d        # spin up just postgres on localhost:5432
cp apps/web/.env.example apps/web/.env
# fill in real secrets in apps/web/.env
bun install
bun dev                     # runs web + docs in parallel
```

The compose file is **dev-only** — it brings up a single postgres
container for `bun dev` to talk to. There is no app container; the app
runs natively on your machine.

## Schema migrations

Prod migrations use **`drizzle-kit migrate`** (versioned SQL files in
`apps/web/drizzle/`), not `push`. Migration files are generated locally,
reviewed, and committed before deploying.

### one-time baseline (run once before the next deploy)

The existing prod schema must be stamped as baseline 0000 so the migrator
doesn't try to recreate it. On the prod box as the `unehaus` user:

```bash
set -a; . /etc/unehaus/.env; set +a
cd /opt/unehaus && bun run --filter web db:baseline
```

This marks `0000_baseline.sql` as applied without executing it, so the next
`db:migrate` run only applies `0001_add_engagement_indexes.sql` onward.

### every deploy

The deploy already runs `bun run db:migrate` (= `drizzle-kit migrate`),
which applies any migration files not yet recorded in
`drizzle.__drizzle_migrations`. No manual steps needed after baselining.

### adding future schema changes

1. Edit `apps/web/src/db/schema.ts`.
2. `cd apps/web && DATABASE_URL=postgres://dummy bunx drizzle-kit generate --name <description>`
3. Review the generated SQL carefully — especially enums: confirm `ALTER TYPE … ADD VALUE`, never `DROP TYPE`.
4. Commit the `.sql` file alongside the schema change.

**`drizzle-kit push` must never be used against prod again.**

## Production deploy

Provisioned and operated from the `homelab` repo. See
`homelab/docs/unehaus-migration/04-native-plan.md` for topology and the
`unehaus` + `postgres` Ansible roles.
