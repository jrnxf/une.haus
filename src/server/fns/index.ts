import { listMessages } from "~/server/fns/messages/list";

export const rpc = {
  messages: {
    list: listMessages,
  },
};
