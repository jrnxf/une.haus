import Ably from "ably"
import { defineEventHandler, getRequestIP } from "h3"
import { useSession } from "h3"

import { env } from "~/lib/env"
import { HAUS_SESSION_KEY } from "~/lib/session/index"
import { type HausSession } from "~/lib/session/schema"

const ably = new Ably.Rest(env.ABLY_API_KEY)

async function hashIP(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hash).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export default defineEventHandler(async (event) => {
  const session = await useSession<HausSession>(event, {
    name: HAUS_SESSION_KEY,
    password: env.SESSION_SECRET,
  })

  const user = session.data.user
  let clientId: string

  if (user) {
    clientId = `user:${user.id}`
  } else {
    const ip = getRequestIP(event, { xForwardedFor: true }) ?? "unknown"
    clientId = `guest:${await hashIP(ip)}`
  }

  const tokenRequest = await ably.auth.createTokenRequest({ clientId })

  return tokenRequest
})
