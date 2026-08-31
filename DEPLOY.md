# Deploy

`une.haus` deploys continuously: **pushing to `main` is the deploy**. GitHub
Actions builds the app and ships it to Cloudflare Workers with `wrangler`.
There is no server to provision — the worker (`unehaus`), its D1 database,
and the `une.haus` custom domain are all Cloudflare-managed.

## Pipeline (`.github/workflows/ci.yml`)

On every push to `main`:

1. **ci** (GH-hosted): runs `bun preflight` — the same gate as local
   pre-commit (lint, format, typecheck, schema check, knip, unit +
   integration tests; the integration runner uses an ephemeral sqlite file,
   no external services).
2. **deploy** (GH-hosted, needs ci, serialized via the `unehaus-deploy`
   concurrency group):
   - `bun run build` — vite emits the worker bundle plus the resolved
     `dist/server/wrangler.json` (this generated config, not the source
     `wrangler.jsonc`, is what actually ships)
   - `bunx wrangler d1 migrations apply unehaus --remote` — applies any
     migration not yet recorded, no-op once current. Roll-forward only.
   - `bunx wrangler deploy`
   - smoke check against `https://une.haus`

Deploy status is visible on every commit in GitHub. **Rollback**: roll back
to a previous worker version in the Cloudflare dash (Workers & Pages →
unehaus → Deployments), or revert the commit and let CI redeploy. Note that
worker rollbacks do not roll back D1 migrations — migrations must stay
backward-compatible with the previous worker version.

## Credentials

The deploy job authenticates with two repo secrets:

- `CLOUDFLARE_API_TOKEN` — API token with `Workers Scripts: Edit` +
  `D1: Edit` on the account
- `CLOUDFLARE_ACCOUNT_ID`

Runtime secrets live on the worker itself (`wrangler secret put` /
`wrangler secret bulk`), not in GitHub — the workflow env block only feeds
the build (env validation, Sentry source maps, `VITE_` vars).
`DATABASE_URL` must NOT exist on the worker: the D1 binding is the
database, and the env validator treats `DATABASE_URL` as optional.

## Manual deploy

```bash
bun run build          # always build first — a stale dist/ ships stale config
bunx wrangler deploy   # needs `wrangler login` or CLOUDFLARE_API_TOKEN
```

## Database (D1)

- Database `unehaus` (id `65de246d-e126-41e9-854c-f7a848c432c1`, WEUR),
  bound as `DB`.
- Migrations live in `drizzle/` and are applied with
  `wrangler d1 migrations apply unehaus --remote` (CI does this on every
  deploy; local dev applies them automatically via `bun run dev`).
- Backups: D1 Time Travel (30-day point-in-time restore). No export
  pipeline.
- Remote inspection:
  `bunx wrangler d1 execute unehaus --remote --command "select ..."`.

## Crons

Two cron triggers, registered from `wrangler.jsonc` on deploy (UTC):

- `0 0 * * 1` — weekly RIU rotation (keep in sync with `ROTATION_CRON` in
  `src/lib/games/rius/lifecycle.ts`)
- `0 * * * *` — hourly notifications

The dispatch table lives in `src/server.ts`.

## Environment variables

Adding a new secret/env var touches:

1. **Code**: `src/lib/env.ts` (validator) + `.env.example`.
2. **Worker**: `bunx wrangler secret put NAME` (runtime).
3. **CI**: add to the workflow env block only if the _build_ needs it.
4. **Local**: add the real value to `.env` (and `.dev.vars` for
   `wrangler`-served local runs).

## Observability

- Sentry (server + client), configured in `src/server.ts` /
  `vite.config.ts`; source maps upload during the CI build via
  `SENTRY_AUTH_TOKEN`.
- Workers Logs in the Cloudflare dash for tail/live logs. See
  `docs/logging.md`.
