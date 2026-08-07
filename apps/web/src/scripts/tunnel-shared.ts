import net from "node:net"

// Shared plumbing for scripts that reach the homelab Postgres through an ssh
// tunnel (with-db-tunnel.ts, sandbox.ts). Policy — which ports to forward,
// when to open a tunnel at all — stays with the callers.

// Hosts that mean "this database is reached on this machine" (possibly
// through a tunnel).
export const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])

export function canConnect(port: number, timeoutMs: number): Promise<boolean> {
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

// Poll until the port accepts connections. `shouldAbort` lets callers bail
// early, e.g. when the tunnel process has already died.
export async function waitForPort(
  port: number,
  attempts: number,
  shouldAbort?: () => boolean,
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    if (await canConnect(port, 1000)) return true
    if (shouldAbort?.()) return false
    await Bun.sleep(500)
  }
  return false
}
