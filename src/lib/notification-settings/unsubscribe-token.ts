import "@tanstack/react-start/server-only"
import { createHmac, timingSafeEqual } from "node:crypto"

import { env } from "~/lib/env"
import { type UnsubscribeType } from "~/lib/notification-settings/schemas"

export function signUnsubscribe(userId: number, type: UnsubscribeType): string {
  return createHmac("sha256", env.SESSION_SECRET)
    .update(`${userId}:${type}`)
    .digest("hex")
}

export function verifyUnsubscribe(
  userId: number,
  type: UnsubscribeType,
  token: string,
): boolean {
  const expected = signUnsubscribe(userId, type)
  if (token.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected))
}
