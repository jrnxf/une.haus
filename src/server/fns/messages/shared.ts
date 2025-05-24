import { invariant } from "~/lib/invariant";
import { z } from "zod";
import { chatMessages, postMessages } from "~/db/schema";

export const recordWithMessagesTypes = ["post", "chat"] as const;

export const messageFormSchema = z.object({
  content: z.string().min(1),
});

export type MessageFormOutput = z.infer<typeof messageFormSchema>;

export const baseMessageSchema = z.object({
  recordId: z.number(), // the id of the thing receiving the message (in the case of chat just pass in -1 since there is no id)
  type: z.enum(recordWithMessagesTypes),
});

export type RecordWithMessages = z.infer<typeof baseMessageSchema>;

export type RecordWithMessagesType = RecordWithMessages["type"];

export const createUpdateMessageSchema = z.intersection(
  messageFormSchema,
  baseMessageSchema,
);

export const getTableByType = (type: RecordWithMessagesType) => {
  const table =
    type === "post" ? postMessages : type === "chat" ? chatMessages : undefined;

  invariant(
    table,
    `Expected type to be one of ${recordWithMessagesTypes.join(", ")}. Received ${type}`,
  );

  return table;
};
