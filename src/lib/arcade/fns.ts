import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import { saveHighScoreSchema } from "~/lib/arcade/schemas"
import { authMiddleware, authOptionalMiddleware } from "~/lib/middleware"

const loadArcadeOps = createServerOnlyFn(
  () => import("~/lib/arcade/ops.server"),
)

export const getArcadeHighScoreServerFn = createServerFn({
  method: "GET",
})
  .middleware([authOptionalMiddleware])
  .handler(async ({ context }) => {
    if (!context.user) return 0
    const { getHighScore } = await loadArcadeOps()
    return getHighScore(context.user.id)
  })

export const saveArcadeHighScoreServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(saveHighScoreSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { saveHighScore } = await loadArcadeOps()
    return saveHighScore(ctx)
  })
