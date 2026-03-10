import { z } from "zod"

export const recordWithMessagesTypes = [
  "post",
  "riuSet",
  "riuSubmission",
  "utvVideo",
  "biuSet",
  "siuSet",
] as const

export const messageFormSchema = z.object({
  content: z.string().min(1),
})

export type MessageFormOutput = z.infer<typeof messageFormSchema>

export const chatParentMessageSchema = z.object({
  id: z.literal(-1),
  type: z.literal("chat"),
})

export type ChatMessageOutput = z.infer<typeof chatParentMessageSchema>

export const recordParentMessageSchema = z.object({
  id: z.number().positive().int(), // the id of the thing receiving the message (in the case of chat just pass in -1 since there is no id)
  type: z.enum(recordWithMessagesTypes),
})

export const messageParentSchema = z.discriminatedUnion("type", [
  chatParentMessageSchema,
  recordParentMessageSchema,
])

export type MessageParent = z.infer<typeof messageParentSchema>

export type MessageParentType = MessageParent["type"]

export const listMessagesSchema = messageParentSchema

export const messageIdSchema = z.object({
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
