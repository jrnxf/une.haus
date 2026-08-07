# Sandbox

The app in docker against a clone of the prod (homelab) database. Everything
runs on your machine: postgres in a container on `localhost:55432`, the built
web app in a container on **http://localhost:3100**.

```bash
bun run sandbox            # clone prod + migrate + build + up
bun run sandbox dev        # clone prod + migrate + vite dev on the host (:3000)
bun run sandbox clone      # re-clone prod (drops sandbox schema first)
bun run sandbox migrate    # apply committed drizzle migrations to sandbox
bun run sandbox build      # rebuild apps/web/.output against sandbox db
bun run sandbox up         # start containers
bun run sandbox down       # stop containers (data volume survives)
```

`bun run dev` (web) is an alias for `bun run sandbox dev`: every dev session
starts from a fresh clone of prod, then runs the normal vite dev server on the
host against the sandbox postgres — tinker freely, prod can't be touched. The
old dev-against-prod-through-the-tunnel flow is still there as
`bun run dev:prod` in `apps/web`.

## How it works

- **Clone**: opens its own ssh tunnel to the homelab box on local port 55433
  (`ExitOnForwardFailure=no` so the `unehaus-db` alias's 5432 forward failing
  against a local postgres doesn't kill the tunnel — only 55433 has to come
  up), `pg_dump --format=custom` with the
  credentials from `apps/web/.env`, then drop-and-restore into the sandbox
  postgres. The dump lands at `sandbox/prod.dump` (gitignored).
- **Migrate**: `drizzle-kit migrate` pointed at the sandbox — prod's
  `drizzle.__drizzle_migrations` journal comes over with the clone, so only
  migrations not yet applied to prod run here. This is the place to rehearse a
  pending migration before pushing.
- **Web container**: `oven/bun` running the real production bundle
  (`apps/web/.output`, mounted read-only — nitro output is pure JS, so the
  host build runs fine on linux). Secrets come from `apps/web/.env` via
  `env_file`; `DATABASE_URL` is overridden to the in-network sandbox postgres
  so the app can never reach the tunneled prod database.

## Auth flow

Auth is unchanged and fully functional: request a code at
`http://localhost:3100`, the real Resend key sends the email, enter the code,
and the session cookie is set for localhost (Chrome treats `localhost` as a
secure context, so the `secure` cookie works over plain http). You stay on
localhost the whole way — nothing points at une.haus.

## Caveats

- Real third-party keys are live: emails actually send, and a video upload
  would create a real mux asset. Mux webhooks can't reach localhost, so
  uploaded videos will sit in "processing" in the sandbox.
- The sandbox holds a copy of prod data — treat `sandbox/prod.dump` and the
  `sandbox_pg` volume accordingly. `docker volume rm unehaus-sandbox_sandbox_pg`
  wipes it.
- Port map: 3100 (web container), 55432 (sandbox postgres), 55433 (clone
  tunnel, transient). `sandbox dev` runs vite on the usual 3000; nothing
  touches 5432, so other projects keep working.
