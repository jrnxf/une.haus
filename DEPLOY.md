# Deploy

`une.haus` deploys continuously: **pushing to `main` is the deploy**.
Cloudflare Workers Builds (git integration on the `unehaus` worker) checks,
builds and ships the app. There is no GitHub Actions workflow and no
Cloudflare API token in GitHub. There is no server to provision - the worker
(`unehaus`), its D1 database, and the `une.haus` custom domain are all
Cloudflare-managed.

## Pipeline (Workers & Pages -> unehaus -> Settings -> Builds)

On every push to `main` Cloudflare runs, in one build container:

1. **build command**: `bun run preflight && bun run build`
   - `bun run preflight` is the same gate as local pre-commit (lint, format,
     typecheck, react-doctor, schema check, knip, unit + integration tests;
     the integration runner uses an ephemeral sqlite file and the tests fill
     in placeholder credentials, see `src/testing/preload.ts`, so no real
     secrets are needed to check).
   - `bun run build` - vite emits the worker bundle plus the resolved
     `dist/server/wrangler.json` (this generated config, not the source
     `wrangler.jsonc`, is what actually ships).
2. **deploy command**:
   `bunx wrangler d1 migrations apply unehaus --remote && bunx wrangler deploy`
   - the migration step applies any migration not yet recorded, no-op once
     current. Roll-forward only. If it fails the worker is not deployed.

Settings that must exist in the dashboard:

| setting                              | value                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| Git repository                       | `jrnxf/une.haus`                                                                |
| Production branch                    | `main`                                                                          |
| Root directory                       | `/` (empty)                                                                     |
| Build command                        | `bun run preflight && bun run build`                                            |
| Deploy command                       | `bunx wrangler d1 migrations apply unehaus --remote && bunx wrangler deploy`    |
| Non-production branch deploy command | leave the default (`npx wrangler versions upload`), never the migration command |

Build variables and secrets (Settings -> Builds -> Variables and secrets;
these are separate from the worker's runtime secrets):

| name                | kind     | why                                                              |
| ------------------- | -------- | ---------------------------------------------------------------- |
| `BUN_VERSION`       | variable | `1.3.2`, matches `packageManager` in `package.json`              |
| `VITE_ENVIRONMENT`  | variable | `production`, inlined into the client bundle at build time       |
| `VITE_SENTRY_DSN`   | variable | client Sentry DSN, inlined into the client bundle at build time  |
| `SENTRY_AUTH_TOKEN` | secret   | uploads source maps during `vite build`; build passes without it |

Nothing else is needed at build time. The runtime secrets below are not
build variables.

Build status is visible on every commit in GitHub (Cloudflare check run).
**Rollback**: roll back to a previous worker version in the Cloudflare dash
(Workers & Pages -> unehaus -> Deployments), or revert the commit and let
Builds redeploy. Note that worker rollbacks do not roll back D1 migrations -
migrations must stay backward-compatible with the previous worker version.

## Credentials

There are no deploy credentials in GitHub. Workers Builds authenticates with
its own Cloudflare-managed token.

Runtime secrets live on the worker itself (`wrangler secret put` /
`wrangler secret bulk`): `CLOUDFLARE_ACCOUNT_ID`,
`CLOUDFLARE_IMAGES_EDITOR_API_TOKEN`, `GOOGLE_API_KEY`, `MUX_TOKEN_ID`,
`MUX_TOKEN_SECRET`, `MUX_WEBHOOK_SECRET`, `RESEND_API_KEY`, `SESSION_SECRET`,
`SENTRY_DSN`. `DATABASE_URL` must NOT exist on the worker: the D1 binding is
the database, and the env validator treats `DATABASE_URL` as optional.

## Manual deploy

```bash
bun run build          # always build first — a stale dist/ ships stale config
bunx wrangler deploy   # needs `wrangler login` or CLOUDFLARE_API_TOKEN
```

## Database (D1)

- Database `unehaus` (id `65de246d-e126-41e9-854c-f7a848c432c1`, WEUR),
  bound as `DB`.
- Migrations live in `drizzle/` and are applied with
  `wrangler d1 migrations apply unehaus --remote` (Workers Builds does this on every
  deploy; local dev applies them automatically via `bun run dev`).
- Backups: D1 Time Travel (30-day point-in-time restore). No export
  pipeline.
- Remote inspection:
  `bunx wrangler d1 execute unehaus --remote --command "select ..."`.

## Crons

Two cron triggers, registered from `wrangler.jsonc` on deploy (UTC):

- `0 0 * * MON` — weekly RIU rotation, Monday 00:00 UTC (keep in sync with
  `ROTATION_CRON` in `src/lib/games/rius/lifecycle.ts`). The weekday is
  named because Cloudflare numbers days 1-7 from Sunday, so `1` is Sunday.
- `0 * * * *` — hourly notifications

The dispatch table lives in `src/server.ts`.

## Environment variables

Adding a new secret/env var touches:

1. **Code**: `src/lib/env.ts` (validator) + `.env.example`.
2. **Worker**: `bunx wrangler secret put NAME` (runtime).
3. **Build**: add as a Workers Builds variable only if the _build_ needs it
   (`VITE_` vars, source map upload); tests fill placeholders themselves.
4. **Local**: add the real value to `.env` (and `.dev.vars` for
   `wrangler`-served local runs).

## Observability

- Sentry (server + client), configured in `src/server.ts` /
  `vite.config.ts`; source maps upload during the build via
  `SENTRY_AUTH_TOKEN`.
- Workers Logs in the Cloudflare dash for tail/live logs. See
  `docs/logging.md`.
