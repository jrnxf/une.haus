import { z } from "zod"

import { contentTypes } from "~/lib/engagement/manifest"

/**
 * Non-chat message parent types — the content entities a rider can attach a
 * message to. Re-exported from the engagement manifest's `contentTypes`, which
 * projects the server-only registry and locks its union at compile time. Every
 * engageable content entity accepts messages, so the two lists are the same.
 * Two further guards keep dispatch and validation in lock-step:
 *   - a compile-time `AssertEqual` in `messages/ops.server.ts`, and
 *   - a runtime equality assertion in `messages.integration.test.ts`.
 */
export const recordWithMessagesTypes = contentTypes

const messageFormSchema = z.object({
  content: z.string().min(1),
})

const chatParentMessageSchema = z.object({
  focus: z.number().positive().int().optional(),
  id: z.literal(-1),
  type: z.literal("chat"),
})

const recordParentMessageSchema = z.object({
  id: z.number().positive().int(), // the id of the thing receiving the message (in the case of chat just pass in -1 since there is no id)
  type: z.enum(recordWithMessagesTypes),
})

const messageParentSchema = z.discriminatedUnion("type", [
  chatParentMessageSchema,
  recordParentMessageSchema,
])

export type MessageParent = z.infer<typeof messageParentSchema>

export type MessageParentType = MessageParent["type"]

export const listMessagesSchema = messageParentSchema

const messageIdSchema = z.object({
  id: z.number().positive().int(), // the message id
})

export const deleteMessageSchema = z.intersection(
  messageIdSchema,
  z.object({
    type: z.enum(["chat", ...recordWithMessagesTypes]),
  }),
)

export const createMessageSchema = z.intersection(
  messageFormSchema,
  messageParentSchema,
)

export const updateMessageSchema = z.intersection(
  messageFormSchema,
  z.intersection(
    messageIdSchema,
    z.object({
      type: z.enum(["chat", ...recordWithMessagesTypes]),
    }),
  ),
)
