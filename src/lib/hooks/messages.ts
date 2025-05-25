import { toast } from "sonner";

import type { RecordWithMessages } from "~/models/messages";
import type { ProcedureOptions } from "~/server/api/root";

import { useSessionUser } from "~/lib/session";
import { api } from "~/trpc/react";

export function useDeleteMessage(
  record: RecordWithMessages,
  arguments_?: Pick<ProcedureOptions["messages"]["delete"], "onSuccess">,
) {
  const utilities = api.useUtils();

  return api.messages.delete.useMutation<{
    previousData: ReturnType<typeof utilities.messages.list.getData>;
  }>({
    onError: (error, _message, context) => {
      if (context) {
        toast(error.message);
        utilities.messages.list.setData(record, context.previousData);
      }
    },
    onMutate: async (deletedMessage) => {
      utilities.messages.list.cancel();

      const previousData = utilities.messages.list.getData(record);

      utilities.messages.list.setData(record, (previous = []) => {
        return previous.filter(
          (message) => message.id !== deletedMessage.recordId,
        );
      });

      return { previousData };
    },
    onSettled: () => utilities.messages.list.invalidate(),
    ...arguments_,
  });
}

export function useLikeUnlikeMessage(
  record: RecordWithMessages,
  messageId: number,
) {
  const sessionUser = useSessionUser();
  const utilities = api.useUtils();

  return api.reaction.react.useMutation<{
    previousData: ReturnType<typeof utilities.messages.list.getData>;
  }>({
    onError: (_error, _newLikeUnlike, context) => {
      if (context) {
        utilities.messages.list.setData(record, context.previousData);
      }
    },
    onMutate: (data) => {
      utilities.messages.list.cancel();

      const previousData = utilities.messages.list.getData(record);

      utilities.messages.list.setData(record, (previous = []) => {
        return previous.map((message) => {
          if (sessionUser && message.id === messageId) {
            if (data.action === "like") {
              return {
                ...message,
                likes: [...message.likes, { user: sessionUser }],
              };
            } else if (data.action === "unlike") {
              return {
                ...message,
                likes: message.likes.filter(
                  (like) => like.user.id !== sessionUser.id,
                ),
              };
            }
          }
          return message;
        });
      });

      return { previousData };
    },
    onSettled: () => {
      utilities.messages.list.invalidate();
    },
  });
}

export function useUpdateMessage(
  record: RecordWithMessages,
  arguments_: Pick<ProcedureOptions["messages"]["update"], "onSuccess">,
) {
  const sessionUser = useSessionUser();
  const utilities = api.useUtils();

  return api.messages.update.useMutation<{
    previousData: ReturnType<typeof utilities.messages.list.getData>;
  }>({
    onError: (error, _message, context) => {
      if (context) {
        toast(error.message);
        utilities.messages.list.setData(record, context.previousData);
      }
    },
    onMutate: async (editedMessage) => {
      utilities.messages.list.cancel();

      const previousData = utilities.messages.list.getData(record);

      utilities.messages.list.setData(record, (previous) => {
        if (previous && sessionUser) {
          return previous.map((message) => {
            if (message.id === editedMessage.recordId) {
              return {
                ...message,
                content: editedMessage.content,
              };
            }

            return message;
          });
        }
      });

      return { previousData };
    },
    onSettled: () => utilities.messages.list.invalidate(),
    ...arguments_,
  });
}
