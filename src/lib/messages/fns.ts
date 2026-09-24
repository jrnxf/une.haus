import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import {
  createMessageSchema,
  deleteMessageSchema,
  listMessagesSchema,
  updateMessageSchema,
} from "~/lib/messages/schemas"
import { authMiddleware } from "~/lib/middleware"

const loadMessageOps = createServerOnlyFn(
  () => import("~/lib/messages/ops.server"),
)

export const listMessagesServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listMessagesSchema))
  .handler(async ({ data: input }) => {
    const { listMessages } = await loadMessageOps()
    return listMessages(input)
  })

export const createMessageServerFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .inputValidator(zodValidator(createMessageSchema))
  .handler(async (ctx) => {
    const { createMessage } = await loadMessageOps()
    return createMessage(ctx)
  })

export const updateMessageServerFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .inputValidator(zodValidator(updateMessageSchema))
  .handler(async (ctx) => {
    const { updateMessage } = await loadMessageOps()
    return updateMessage(ctx)
  })

export const deleteMessageServerFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .inputValidator(zodValidator(deleteMessageSchema))
  .handler(async (ctx) => {
    const { deleteMessage } = await loadMessageOps()
    return deleteMessage(ctx)
  })
