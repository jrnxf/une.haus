import { useMutation, useQueryClient } from "@tanstack/react-query";

import { invariant } from "~/lib/invariant";
import { messages } from "~/lib/messages";
import { type RecordWithMessages } from "~/lib/messages/schemas";
import { useSessionUser } from "~/lib/session/hooks";

export function useCreateMessage(record: RecordWithMessages) {
  const sessionUser = useSessionUser();

  const qc = useQueryClient();

  const listOptions = messages.list.queryOptions({
    type: record.type,
    recordId: record.recordId,
  });

  const mutation = useMutation({
    mutationFn: messages.create.fn,

    onMutate: async (newMessage) => {
      invariant(sessionUser, "sessionUser is required");

      qc.cancelQueries({
        queryKey: listOptions.queryKey,
      });

      const prev = qc.getQueryData(listOptions.queryKey);

      qc.setQueryData(listOptions.queryKey, (prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          messages: [
            ...prev.messages,
            {
              content: newMessage.data.content,
              createdAt: new Date(),
              id: Math.random(),
              likes: [],
              user: sessionUser,
              userId: sessionUser.id,
            },
          ],
        };
      });

      return { prev };
    },
    onError: (error, _variables, context) => {
      console.error(error);
      if (context) {
        qc.setQueryData(listOptions.queryKey, context.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: listOptions.queryKey,
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

// export function useUpdateMessage(
//   record: RecordWithMessages,
//   args: Pick<ProcedureOptions["messages"]["update"], "onSuccess">,
// ) {
//   const qc = useQueryClient();

//   const mutation = useMutation();

//   return {
//     ...mutation,
//     mutate: (content: string) => {
//       mutation.mutate({
//         data: {
//           ...record,
//           content,
//         },
//       });
//     },
//   };
//   return api.messages.update.useMutation<{
//     previousData: ReturnType<typeof utils.messages.list.getData>;
//   }>({
//     onError: (error, _message, ctx) => {
//       if (ctx) {
//         toast(error.message);
//         utils.messages.list.setData(record, ctx.previousData);
//       }
//     },
//     onMutate: async (editedMessage) => {
//       utils.messages.list.cancel();

//       const previousData = utils.messages.list.getData(record);

//       utils.messages.list.setData(record, (prev) => {
//         if (prev && sessionUser) {
//           return prev.map((message) => {
//             if (message.id === editedMessage.recordId) {
//               return {
//                 ...message,
//                 content: editedMessage.content,
//               };
//             }

//             return message;
//           });
//         }
//       });

//       return { previousData };
//     },
//     onSettled: () => utils.messages.list.invalidate(),
//     ...args,
//   });
// }

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
