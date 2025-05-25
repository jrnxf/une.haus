import { z } from "zod";

export const recordWithMessagesTypes = ["post", "chat"] as const;

export const messageFormSchema = z.object({
  content: z.string().min(1),
});

export type MessageFormOutput = z.infer<typeof messageFormSchema>;

export const baseSchema = z.object({
  recordId: z.number(), // the id of the thing receiving the message (in the case of chat just pass in -1 since there is no id)
  type: z.enum(recordWithMessagesTypes),
});

export type RecordWithMessages = z.infer<typeof baseSchema>;

export type RecordWithMessagesType = RecordWithMessages["type"];

export const listMessagesSchema = baseSchema;

export const deleteMessageSchema = baseSchema;

export const createMessageSchema = z.intersection(
  messageFormSchema,
  baseSchema,
);

export const updateMessageSchema = z.intersection(
  messageFormSchema,
  baseSchema,
);
