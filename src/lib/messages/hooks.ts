import { useMutation, useQueryClient } from "@tanstack/react-query";
import invariant from "tiny-invariant";
import { MESSAGES_KEY } from "~/lib/keys";
import { useSessionUser } from "~/lib/session";
import { rpc } from "~/server/fns";

import { createMessage } from "~/server/fns/messages/create";
import { listMessages, type Message } from "~/server/fns/messages/list";
import { type RecordWithMessages } from "~/server/fns/messages/shared";

export function useCreateMessage(record: RecordWithMessages) {
  const sessionUser = useSessionUser();

  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: createMessage.serverFn,

    onMutate: async (newMessage) => {
      invariant(sessionUser, "sessionUser is required");

      const listOptions = rpc.messages.list.queryOptions({
        type: record.type,
        recordId: record.recordId,
      });

      qc.cancelQueries({
        queryKey: listOptions.queryKey,
      });

      const prev = qc.getQueryData(listOptions.queryKey);

      if (prev) {
        qc.setQueryData(listOptions.queryKey, [
          ...prev,
          {
            content: newMessage.data.content,
            createdAt: new Date(),
            id: Math.random(),
            likes: [],
            user: sessionUser,
            userId: sessionUser.id,
          },
        ]);
      }

      return { prev };
    },
    onError: (error, _variables, context) => {
      console.error(error);
      if (context) {
        qc.setQueryData(
          [MESSAGES_KEY, record.type, record.recordId],
          context.prev,
        );
      }
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: [MESSAGES_KEY, record.type, record.recordId],
      });
    },
  });

  return {
    ...mutation,
    mutate: (content: string) => {
      mutation.mutate({
        data: {
          ...record,
          content,
        },
      });
    },
  };
}

export function useUpdateMessage(
  record: RecordWithMessages,
  args: Pick<ProcedureOptions["messages"]["update"], "onSuccess">,
) {
  const qc = useQueryClient();

  const mutation = useMutation();

  return {
    ...mutation,
    mutate: (content: string) => {
      mutation.mutate({
        data: {
          ...record,
          content,
        },
      });
    },
  };
  return api.messages.update.useMutation<{
    previousData: ReturnType<typeof utils.messages.list.getData>;
  }>({
    onError: (error, _message, ctx) => {
      if (ctx) {
        toast(error.message);
        utils.messages.list.setData(record, ctx.previousData);
      }
    },
    onMutate: async (editedMessage) => {
      utils.messages.list.cancel();

      const previousData = utils.messages.list.getData(record);

      utils.messages.list.setData(record, (prev) => {
        if (prev && sessionUser) {
          return prev.map((message) => {
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
    onSettled: () => utils.messages.list.invalidate(),
    ...args,
  });
}

// export function useDeleteMessage(
//   record: RecordWithMessages,
//   args?: Pick<ProcedureOptions["messages"]["delete"], "onSuccess">,
// ) {
//   const utils = api.useUtils();

//   return api.messages.delete.useMutation<{
//     previousData: ReturnType<typeof utils.messages.list.getData>;
//   }>({
//     onError: (error, _message, ctx) => {
//       if (ctx) {
//         toast(error.message);
//         utils.messages.list.setData(record, ctx.previousData);
//       }
//     },
//     onMutate: async (deletedMessage) => {
//       utils.messages.list.cancel();

//       const previousData = utils.messages.list.getData(record);

//       utils.messages.list.setData(record, (prev = []) => {
//         return prev.filter((message) => message.id !== deletedMessage.recordId);
//       });

//       return { previousData };
//     },
//     onSettled: () => utils.messages.list.invalidate(),
//     ...args,
//   });
// }

// export function useLikeUnlikeMessage(
//   record: RecordWithMessages,
//   messageId: number,
// ) {
//   const sessionUser = useSessionUser();
//   const utils = api.useUtils();

//   return api.reaction.react.useMutation<{
//     previousData: ReturnType<typeof utils.messages.list.getData>;
//   }>({
//     onError: (_error, _newLikeUnlike, ctx) => {
//       if (ctx) {
//         utils.messages.list.setData(record, ctx.previousData);
//       }
//     },
//     onMutate: (data) => {
//       utils.messages.list.cancel();

//       const previousData = utils.messages.list.getData(record);

//       utils.messages.list.setData(record, (prev = []) => {
//         return prev.map((message) => {
//           if (sessionUser && message.id === messageId) {
//             if (data.action === "like") {
//               return {
//                 ...message,
//                 likes: [...message.likes, { user: sessionUser }],
//               };
//             } else if (data.action === "unlike") {
//               return {
//                 ...message,
//                 likes: message.likes.filter(
//                   (like) => like.user.id !== sessionUser.id,
//                 ),
//               };
//             }
//           }
//           return message;
//         });
//       });

//       return { previousData };
//     },
//     onSettled: () => {
//       utils.messages.list.invalidate();
//     },
//   });
// }
