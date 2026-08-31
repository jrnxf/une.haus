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
  .inputValidator(zodValidator(createMessageSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { createMessage } = await loadMessageOps()
    return createMessage(ctx)
  })

export const updateMessageServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateMessageSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { updateMessage } = await loadMessageOps()
    return updateMessage(ctx)
  })

export const deleteMessageServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(deleteMessageSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { deleteMessage } = await loadMessageOps()
    return deleteMessage(ctx)
  })
