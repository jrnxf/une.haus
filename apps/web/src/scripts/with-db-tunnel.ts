import net from "node:net"
import process from "node:process"

// Run a command with the homelab Postgres reachable on localhost.
//
// In local dev the database lives on the homelab box and only listens on that
// box's 127.0.0.1:5432, so it's reached through an SSH tunnel. Rather than
// remember to start `ssh -N unehaus-db` by hand, dev/build run through this
// wrapper: it makes sure the tunnel is up, runs the command, then tears the
// tunnel back down (only if it was the one that opened it).
//
// The tunnel is opened only when localhost:5432 isn't already reachable, which
// makes this a no-op in two cases that must keep working:
//   - a tunnel the user already started themselves (we reuse it, never kill it)
//   - the production box, where Postgres is local on 5432 (no tunnel wanted)
//
// Escape hatch: set DB_TUNNEL=0 to skip tunnel management entirely.

const host = process.env.DB_TUNNEL_HOST ?? "unehaus-db"
const port = Number(process.env.DB_TUNNEL_PORT ?? 5432)
const command = process.argv.slice(2).join(" ")

if (!command) {
  console.error("with-db-tunnel: no command to run")
  process.exit(1)
}

function canConnect(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port })
    const done = (ok: boolean) => {
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(timeoutMs)
    socket.once("connect", () => done(true))
    socket.once("timeout", () => done(false))
    socket.once("error", () => done(false))
  })
}

async function waitForPort(attempts: number): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    if (await canConnect(1000)) return true
    await Bun.sleep(500)
  }
  return false
}

let tunnel: Bun.Subprocess | undefined

function closeTunnel() {
  if (tunnel && tunnel.exitCode === null) tunnel.kill()
  tunnel = undefined
}

const skip = process.env.DB_TUNNEL === "0"

if (!skip && !(await canConnect(1000))) {
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

  if (!(await waitForPort(20))) {
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
