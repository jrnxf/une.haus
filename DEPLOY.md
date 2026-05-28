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

## Production deploy

Provisioned and operated from the `homelab` repo. See
`homelab/docs/unehaus-migration/04-native-plan.md` for topology and the
`unehaus` + `postgres` Ansible roles.
