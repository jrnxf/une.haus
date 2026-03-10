import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { games } from "~/lib/games"
import { session } from "~/lib/session/index"

const searchSchema = z.object({
  roundId: z.coerce.number().int().positive().optional(),
  parentSetId: z.coerce.number().int().positive().optional(),
})

export const Route = createFileRoute("/_authed/games/bius/upload")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    if (deps.roundId) {
      throw redirect({
        to: "/games/bius/$biuId/upload",
        params: { biuId: deps.roundId },
        replace: true,
      })
    }

    if (deps.parentSetId) {
      const set = await context.queryClient.ensureQueryData(
        games.bius.sets.get.queryOptions({ setId: deps.parentSetId }),
      )

      if (!set) {
        throw new Error("Set not found")
      }

      throw redirect({
        to: "/games/bius/$biuId/upload",
        params: { biuId: set.biu.id },
        replace: true,
      })
    }

    throw new Error("Invalid upload link")
  },
  onError: async () => {
    await session.flash.set.fn({
      data: { type: "error", message: "invalid upload link" },
    })
    throw redirect({ to: "/games" })
  },
})
