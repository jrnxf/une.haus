import { z } from "zod"

/**
 * Non-chat message parent types. This list mirrors the keys of
 * `MESSAGE_PARENT_REGISTRY` in the server-only engagement registry, which is the
 * source of truth for message dispatch. It is duplicated here (rather than
 * imported) because schemas run on the client, where the server-only registry
 * cannot be bundled. Two guards keep the two in lock-step:
 *   - a compile-time `AssertEqual` in `messages/ops.server.ts`, and
 *   - a runtime equality assertion in `messages.integration.test.ts`.
 */
export const recordWithMessagesTypes = [
  "post",
  "riuSet",
  "riuSubmission",
  "utvVideo",
  "biuSet",
  "siuSet",
] as const

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
