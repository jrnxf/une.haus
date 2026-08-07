# Deploy

`une.haus` deploys continuously: **pushing to `main` is the deploy**. GitHub
Actions builds a self-contained release artifact and ships it to the homelab
LXC through a self-hosted runner. Provisioning (systemd units, env, the
runner itself) lives in the homelab repo (`~/Dev/homelab`) as the `unehaus`
Ansible role — native Bun + systemd, no container runtime.

## Pipeline (`.github/workflows/ci.yml`)

On every push to `main`:

1. **ci** (GH-hosted): runs `bun preflight` — the same gate as local
   pre-commit (lint, format, typecheck, schema check, knip, unit +
   integration tests; the integration runner brings its own postgres
   container via docker).
2. **build** (GH-hosted, parallel with ci): `bun run build:web` +
   `build:docs` on linux-x64 — same platform as the LXC. Bun is pinned via
   `apps/web/package.json` `packageManager` (keep in lockstep with
   `unehaus_bun_version` in the homelab role). Nitro emits self-contained
   `apps/*/.output` bundles (server deps traced into
   `.output/server/node_modules`, pure JS — the job fails if any native
   `.node` binary sneaks in). Also bundles the migration runner
   (`apps/web/src/scripts/migrate-prod.ts` → single-file `migrate.mjs` +
   a copy of `drizzle/`). Everything is tarred and uploaded as an artifact.
3. **deploy** (self-hosted runner on the LXC, needs ci + build, serialized):
   - extract the artifact to `/opt/unehaus/releases/<short-sha>`
   - run migrations (`bun migrate.mjs`, `DATABASE_URL` from
     `/etc/unehaus/.env`)
   - write `GIT_COMMIT=<short-sha>` to `/etc/unehaus/release.env`
   - flip the `/opt/unehaus/current` symlink to the new release
   - `sudo systemctl restart unehaus-web unehaus-docs` (narrow sudoers rule)
   - smoke-check both ports, dumping journal logs on failure
   - prune to the 5 most recent releases

Deploy status is visible on every commit in GitHub. **Rollback**: point
`current` at a previous release dir and restart, or revert the commit and
let CI redeploy.

The runner is outbound-only (long-polls GitHub) — nothing inbound is
exposed; public ingress stays cloudflared.

## Run contract

Each app runs from its workspace inside the active release:

```bash
cd /opt/unehaus/current/apps/web  && bun run start   # port 3000 (PORT to override)
cd /opt/unehaus/current/apps/docs && bun run start   # port 3001
```

In production each is its own systemd unit (`unehaus-web.service` /
`unehaus-docs.service`) reading `/etc/unehaus/.env` plus
`/etc/unehaus/release.env` via `EnvironmentFile=`. The runtime needs only
Bun and `.output` — no `node_modules`, no on-box install or build. Size the
LXC for serving, not building.

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

In the homelab, these are rendered to `/etc/unehaus/.env` by the `unehaus`
role from `ansible-vault`-encrypted secrets. The same values (minus
box-local ones) live in GitHub Actions secrets for the build + test jobs.

### adding an env var

A new env var touches four places — in order:

1. **Code**: `apps/web/src/lib/env.ts` (validator) + `apps/web/.env.example`.
2. **GitHub secrets**: add the secret in repo settings and reference it in the
   `env:` block of `.github/workflows/ci.yml` (build + test jobs read it).
3. **Homelab**: add the vault secret and a line in
   `ansible/roles/unehaus/templates/env.j2`, then `bun run deploy` to render
   `/etc/unehaus/.env` (the converge restarts the units).
4. **Local**: add the real value to `apps/web/.env`.

Ship the code change only after 2–3 are in place, or the build/deploy will
fail env validation.

Observability vars: `SERVICE_NAME` is set per-unit by systemd; `GIT_COMMIT`
comes from `/etc/unehaus/release.env`, rewritten by every deploy. The
structured logger and boot log stamp both onto every line so Loki can
attribute logs to a service and release. Both are absent in local dev. See
`apps/web/docs/logging.md`.

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

For a fully containerized app against a clone of the prod database, see
`sandbox/README.md` (`bun run sandbox`).

## Schema migrations

Prod migrations are applied by the deploy job using a bundled programmatic
migrator (`drizzle-orm`'s `migrate()` — same journal table as
`drizzle-kit migrate`, `drizzle.__drizzle_migrations`, so the two are
interchangeable). Migration files are generated locally, reviewed, and
committed before pushing; the deploy applies anything not yet recorded.
Idempotent: a no-op once all are applied.

(Historical note: the pre-existing prod schema was stamped as baseline 0000
via `db:baseline` — see `apps/web/src/db/scripts/baseline.ts`.)

### adding schema changes

1. Edit `apps/web/src/db/schema.ts`.
2. `cd apps/web && DATABASE_URL=postgres://dummy bunx drizzle-kit generate --name <description>`
3. Review the generated SQL carefully — especially enums: confirm `ALTER TYPE … ADD VALUE`, never `DROP TYPE`.
4. Commit the `.sql` file alongside the schema change — it deploys with the push.

**`drizzle-kit push` must never be used against prod.**

## Provisioning (infra changes only)

Users, systemd units, `/etc/unehaus/.env` from vault, the deploy runner,
and cloudflared are managed by the `unehaus` Ansible role in the homelab
repo. See `homelab/docs/unehaus-migration/04-native-plan.md` for topology.

From this repo:

```bash
bun run deploy       # converge the unehaus role (NOT a code deploy)
```

`scripts/deploy.ts` is a thin wrapper around
`ansible-playbook playbooks/deploy-infra.yml --tags unehaus`. It assumes the
homelab repo is a sibling checkout (`../homelab`); override with
`HOMELAB_DIR`. Extra args pass through, e.g. `bun run deploy --check`.
Registering the runner for the first time needs an authed `gh` CLI on the
control node (it fetches a short-lived registration token).
