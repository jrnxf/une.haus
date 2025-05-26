import { z } from "zod";

export const recordWithMessagesTypes = ["post"] as const;

export const messageFormSchema = z.object({
  content: z.string().min(1),
});

export type MessageFormOutput = z.infer<typeof messageFormSchema>;

export const chatMessageSchema = z.object({
  type: z.literal("chat"),
});

export type ChatMessageOutput = z.infer<typeof chatMessageSchema>;

export const recordMessageSchema = z.object({
  id: z.number(), // the id of the thing receiving the message (in the case of chat just pass in -1 since there is no id)
  type: z.enum(recordWithMessagesTypes),
});

export const messageParentSchema = z.discriminatedUnion("type", [
  chatMessageSchema,
  recordMessageSchema,
]);

export type MessageParent = z.infer<typeof messageParentSchema>;

export type MessageParentType = MessageParent["type"];

export const listMessagesSchema = messageParentSchema;

export const deleteMessageSchema = messageParentSchema;

export const createMessageSchema = z.intersection(
  messageFormSchema,
  messageParentSchema,
);

export const updateMessageSchema = z.intersection(
  messageFormSchema,
  messageParentSchema,
);
