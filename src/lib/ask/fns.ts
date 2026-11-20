import { createServerFn } from "@tanstack/react-start"

import { askBudget } from "~/lib/ask/budget.server"
import { percentUsed } from "~/lib/ask/cost"
import { getServerSessionUser } from "~/lib/session/hooks"

// The share of today's ask budget the member has used, or null when there is
// no limit to show: a guest, or the owner.
export const getAskUsageServerFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const user = await getServerSessionUser()
    const budget = user ? askBudget(user.id) : null
    if (!budget) return null
    return { used: percentUsed(await budget.spent()) }
  },
)
