import { queryOptions } from "@tanstack/react-query"

import {
  createMessageServerFn,
  deleteMessageServerFn,
  listMessagesServerFn,
  updateMessageServerFn,
} from "~/lib/messages/fns"
import {
  createMessageSchema,
  deleteMessageSchema,
  listMessagesSchema,
  updateMessageSchema,
} from "~/lib/messages/schemas"
import { type ServerFnData } from "~/lib/types"

export const messages = {
  list: {
    fn: listMessagesServerFn,
    schema: listMessagesSchema,
    queryOptions: (data: ServerFnData<typeof listMessagesServerFn>) =>
      queryOptions({
        queryKey: ["messages", data],
        queryFn: () => listMessagesServerFn({ data }),
      }),
  },
  create: {
    fn: createMessageServerFn,
    schema: createMessageSchema,
  },
  update: {
    fn: updateMessageServerFn,
    schema: updateMessageSchema,
  },
  delete: {
    fn: deleteMessageServerFn,
    schema: deleteMessageSchema,
  },
}
