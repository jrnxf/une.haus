import { $ } from "bun"
import path from "node:path"
import process from "node:process"

import { LOCAL_HOSTS, waitForPort } from "./tunnel-shared"

// Local sandbox: the app in docker against a clone of the homelab ("prod")
// database. See sandbox/README.md. Run from apps/web (bun auto-loads .env, so
// the tunneled prod DATABASE_URL and the app secrets never need to be pasted
// anywhere).
//
//   bun run sandbox            # clone + migrate + build + up
//   bun run sandbox clone      # dump prod through its own ssh tunnel, restore
//   bun run sandbox migrate    # apply committed drizzle migrations to sandbox
//   bun run sandbox build      # vite build against the sandbox database
//   bun run sandbox up         # start the web container (localhost:3100)
//   bun run sandbox down       # stop containers (volume survives)

const REPO_ROOT = path.resolve(import.meta.dir, "../../../..")
const WEB_DIR = path.resolve(REPO_ROOT, "apps/web")
const COMPOSE_FILE = path.resolve(REPO_ROOT, "sandbox/docker-compose.yml")
const DUMP_FILE = path.resolve(REPO_ROOT, "sandbox/prod.dump")

// Host-side view of the sandbox postgres (container maps 55432 -> 5432).
const SANDBOX_URL = "postgres://unehaus:sandbox@localhost:55432/unehaus"

// The prod tunnel gets a dedicated local port. The `unehaus-db` ssh alias
// also forwards 5432 from ~/.ssh/config; that bind may fail when something
// already holds 5432 (dev compose, other projects), which is why the ssh
// call tolerates forward failures — only our own port has to come up.
const TUNNEL_PORT = 55_433
const SSH_HOST = process.env.DB_TUNNEL_HOST ?? "unehaus-db"

function fail(message: string): never {
  console.error(`sandbox: ${message}`)
  process.exit(1)
}

// The prod database is only reachable through the ssh tunnel, so the .env
// DATABASE_URL must already point at a local host — anything else means this
// isn't the machine the tunnel setup was written for.
function prodUrlThroughTunnel(): string {
  const raw = process.env.DATABASE_URL
  if (!raw) fail("DATABASE_URL is not set (run from apps/web so .env loads)")
  const url = new URL(raw)
  if (!LOCAL_HOSTS.has(url.hostname)) {
    fail(
      `DATABASE_URL host "${url.hostname}" is not local — refusing to guess where prod is`,
    )
  }
  url.hostname = "127.0.0.1"
  url.port = String(TUNNEL_PORT)
  return url.toString()
}

async function withTunnel<T>(run: () => Promise<T>): Promise<T> {
  const tunnel = Bun.spawn(
    [
      "ssh",
      "-N",
      "-o",
      "BatchMode=yes",
      "-o",
      "ConnectTimeout=10",
      "-o",
      "ExitOnForwardFailure=no",
      "-L",
      `${TUNNEL_PORT}:127.0.0.1:5432`,
      SSH_HOST,
    ],
    { stdout: "inherit", stderr: "inherit" },
  )
  try {
    const up = await waitForPort(
      TUNNEL_PORT,
      20,
      () => tunnel.exitCode !== null,
    )
    if (!up) {
      // Throw (not process.exit) so the finally below reaps the tunnel.
      throw new Error(
        tunnel.exitCode === null
          ? `localhost:${TUNNEL_PORT} never became reachable via "${SSH_HOST}"`
          : `ssh tunnel via "${SSH_HOST}" exited`,
      )
    }
    return await run()
  } finally {
    if (tunnel.exitCode === null) tunnel.kill()
  }
}

// Memoized so the `all` pipeline doesn't round-trip the docker daemon once
// per subcommand.
let postgresEnsured = false
async function ensureSandboxPostgres() {
  if (postgresEnsured) return
  await $`docker compose -f ${COMPOSE_FILE} up -d --wait postgres`
  postgresEnsured = true
}

async function clone() {
  await ensureSandboxPostgres()

  console.log("sandbox: dumping prod through ssh tunnel…")
  const prodUrl = prodUrlThroughTunnel()
  await withTunnel(async () => {
    await $`pg_dump --format=custom --no-owner --no-privileges --file ${DUMP_FILE} ${prodUrl}`
  })

  console.log("sandbox: resetting sandbox schema…")
  const dropSql = "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
  await $`psql ${SANDBOX_URL} -v ON_ERROR_STOP=1 -c ${dropSql}`

  console.log("sandbox: restoring dump…")
  const restore =
    await $`pg_restore --no-owner --no-privileges --dbname ${SANDBOX_URL} ${DUMP_FILE}`.nothrow()
  if (restore.exitCode !== 0) {
    fail(`pg_restore exited ${restore.exitCode} — inspect output above`)
  }

  const tables =
    await $`psql ${SANDBOX_URL} -tAc ${"select count(*) from information_schema.tables where table_schema = 'public'"}`.text()
  console.log(`sandbox: restored ${tables.trim()} tables`)
}

async function migrate() {
  await ensureSandboxPostgres()
  console.log("sandbox: applying drizzle migrations…")
  await $`bunx drizzle-kit migrate`
    .cwd(WEB_DIR)
    .env({ ...process.env, DATABASE_URL: SANDBOX_URL })
  const applied =
    await $`psql ${SANDBOX_URL} -tAc ${"select count(*) from drizzle.__drizzle_migrations"}`.text()
  console.log(`sandbox: ${applied.trim()} migrations recorded`)
}

async function build() {
  await ensureSandboxPostgres()
  console.log("sandbox: building web app against sandbox database…")
  await $`bun run build`
    .cwd(WEB_DIR)
    .env({ ...process.env, DATABASE_URL: SANDBOX_URL, DB_TUNNEL: "0" })
}

async function up() {
  await $`docker compose -f ${COMPOSE_FILE} up -d --wait`
  console.log("sandbox: web running at http://localhost:3100")
}

async function down() {
  await $`docker compose -f ${COMPOSE_FILE} down`
}

const command = process.argv[2] ?? "all"

switch (command) {
  case "all":
    await clone()
    await migrate()
    await build()
    await up()
    break
  case "clone":
    await clone()
    break
  case "migrate":
    await migrate()
    break
  case "build":
    await build()
    break
  case "up":
    await up()
    break
  case "down":
    await down()
    break
  default:
    fail(`unknown command "${command}" (clone | migrate | build | up | down)`)
}
