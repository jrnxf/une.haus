import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import { authMiddleware } from "~/lib/middleware"
import { likeRecordSchema, unlikeRecordSchema } from "~/lib/reactions/schemas"

const loadReactionOps = createServerOnlyFn(
  () => import("~/lib/reactions/ops.server"),
)

// react as in the action, not the library lol
export const likeRecordServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(likeRecordSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { likeRecord } = await loadReactionOps()
    return likeRecord(ctx)
  })

export const unlikeRecordServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(unlikeRecordSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { unlikeRecord } = await loadReactionOps()
    return unlikeRecord(ctx)
  })
