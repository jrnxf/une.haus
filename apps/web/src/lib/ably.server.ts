import "@tanstack/react-start/server-only"
import Ably from "ably"

import { env } from "~/lib/env"

export const ably = new Ably.Rest(env.ABLY_API_KEY)
