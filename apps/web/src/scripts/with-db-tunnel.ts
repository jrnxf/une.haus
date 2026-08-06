import process from "node:process"

import { canConnect, LOCAL_HOSTS, waitForPort } from "./tunnel-shared"

// Run a command with the homelab Postgres reachable on localhost.
//
// In local dev the database lives on the homelab box and only listens on that
// box's 127.0.0.1:5432, so it's reached through an SSH tunnel. Rather than
// remember to start `ssh -N unehaus-db` by hand, dev/build run through this
// wrapper: it makes sure the tunnel is up, runs the command, then tears the
// tunnel back down (only if it was the one that opened it).
//
// The tunnel is opened only when the port isn't already reachable, which makes
// this a no-op in two cases that must keep working:
//   - a tunnel the user already started themselves (we reuse it, never kill it)
//   - the production box, where Postgres is local (no tunnel wanted)
//
// The port comes from DATABASE_URL so the two can't drift: forwarding 5432 while
// the app dials 55432 fails in confusing ways, as does the reverse. A non-local
// DATABASE_URL means the app isn't going through a tunnel at all, so skip.
//
// Escape hatches: DB_TUNNEL=0 skips tunnel management entirely, DB_TUNNEL_PORT
// overrides the port derived from DATABASE_URL.

function portFromDatabaseUrl(): number | undefined {
  const raw = process.env.DATABASE_URL
  if (!raw) return undefined
  try {
    const url = new URL(raw)
    if (!LOCAL_HOSTS.has(url.hostname)) return undefined
    return url.port ? Number(url.port) : 5432
  } catch {
    return undefined
  }
}

const host = process.env.DB_TUNNEL_HOST ?? "unehaus-db"
const overridePort = process.env.DB_TUNNEL_PORT
const port = overridePort ? Number(overridePort) : portFromDatabaseUrl()
const command = process.argv.slice(2).join(" ")

if (!command) {
  console.error("with-db-tunnel: no command to run")
  process.exit(1)
}

let tunnel: Bun.Subprocess | undefined

function closeTunnel() {
  if (tunnel && tunnel.exitCode === null) tunnel.kill()
  tunnel = undefined
}

if (
  process.env.DB_TUNNEL !== "0" &&
  port !== undefined &&
  !(await canConnect(port, 1000))
) {
  console.error(`with-db-tunnel: opening ssh tunnel via "${host}"…`)
  // Host alias carries HostName/User/IdentityFile/LocalForward from ~/.ssh/config.
  tunnel = Bun.spawn(
    [
      "ssh",
      "-N",
      "-o",
      "BatchMode=yes",
      "-o",
      "ConnectTimeout=10",
      "-o",
      "ExitOnForwardFailure=yes",
      host,
    ],
    { stdout: "inherit", stderr: "inherit" },
  )

  if (!(await waitForPort(port, 20))) {
    console.error(
      `with-db-tunnel: localhost:${port} never became reachable through "${host}".`,
    )
    closeTunnel()
    process.exit(1)
  }
  console.error(`with-db-tunnel: tunnel up on localhost:${port}.`)
}

const child = Bun.spawn(["sh", "-c", command], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
})

const forward = (signal: NodeJS.Signals) => {
  child.kill(signal === "SIGINT" ? "SIGINT" : "SIGTERM")
}
process.on("SIGINT", forward)
process.on("SIGTERM", forward)

const code = await child.exited
closeTunnel()
process.exit(code)
