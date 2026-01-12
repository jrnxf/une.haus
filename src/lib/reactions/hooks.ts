import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { reactions } from "~/lib/reactions";
import {
  recordTypeToLabel,
  type RecordWithLikesType,
} from "~/lib/reactions/schemas";

import { toast } from "sonner";

import { invariant } from "~/lib/invariant";
import { useSessionUser } from "~/lib/session/hooks";

type RecordReactionArgs = {
  record: {
    id: number;
    type: RecordWithLikesType;
  };
  optimisticUpdateQueryKey: QueryKey;
  refetchQueryKey?: QueryKey;
};

export function useLikeUnlikeRecord({
  authUserLiked,
  ...args
}: RecordReactionArgs & {
  authUserLiked: boolean;
}) {
  const likeMutation = useLikeRecord(args);
  const unlikeMutation = useUnlikeRecord(args);

  return authUserLiked ? unlikeMutation : likeMutation;
}

export function useLikeRecord({
  record,
  optimisticUpdateQueryKey,
  refetchQueryKey,
}: RecordReactionArgs) {
  const qc = useQueryClient();
  const sessionUser = useSessionUser();

  const mutation = useMutation({
    mutationFn: reactions.like.fn,
    onMutate: async () => {
      invariant(sessionUser, "Not authenticated");
      qc.cancelQueries({ queryKey: optimisticUpdateQueryKey });

      const prev = qc.getQueryData(optimisticUpdateQueryKey);

      // TODO COLBY
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      qc.setQueryData(optimisticUpdateQueryKey, (prev: any) => {
        if (!prev) return prev;

        // chat message schemas are a little different so they need to be handled differently
        if (
          record.type === "chatMessage" ||
          record.type === "postMessage" ||
          record.type === "riuSetMessage" ||
          record.type === "riuSubmissionMessage" ||
          record.type === "utvVideoMessage" ||
          record.type === "biuSetMessage" ||
          record.type === "siuStackMessage"
        ) {
          return {
            ...prev,

            // TODO COLBY
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            messages: prev.messages.map((message: any) => {
              if (message.id === record.id) {
                return {
                  ...message,
                  likes: [
                    ...message.likes,
                    {
                      userId: sessionUser.id,
                      user: {
                        id: sessionUser.id,
                        name: sessionUser.name,
                        avatarId: sessionUser.avatarId,
                      },
                    },
                  ],
                };
              }
              return message;
            }),
          };
        }

        return {
          ...prev,
          likes: [
            ...prev.likes,
            {
              userId: sessionUser.id,
              user: {
                id: sessionUser.id,
                name: sessionUser.name,
                avatarId: sessionUser.avatarId,
              },
            },
          ],
        };
      });

      return { prev };
    },
    onError: (error, _variables, context) => {
      toast.error(`Failed to like ${recordTypeToLabel[record.type]}`);
      console.error(error);
      if (context) {
        qc.setQueryData(optimisticUpdateQueryKey, context.prev);
      }
    },
    onSuccess: () => {
      if (refetchQueryKey) {
        qc.refetchQueries({ queryKey: refetchQueryKey });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: optimisticUpdateQueryKey });
    },
  });

  return {
    ...mutation,
    mutate: () => {
      mutation.mutate({
        data: {
          recordId: record.id,
          type: record.type,
        },
      });
    },
  };
}

export function useUnlikeRecord({
  record,
  optimisticUpdateQueryKey,
  refetchQueryKey,
}: RecordReactionArgs) {
  const qc = useQueryClient();
  const sessionUser = useSessionUser();

  const mutation = useMutation({
    mutationFn: reactions.unlike.fn,
    onMutate: async () => {
      invariant(sessionUser, "Not authenticated");

      qc.cancelQueries({ queryKey: optimisticUpdateQueryKey });

      const prev = qc.getQueryData(optimisticUpdateQueryKey);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      qc.setQueryData(optimisticUpdateQueryKey, (prev: any) => {
        if (!prev) return prev;

        // chat message schemas are a little different so they need to be handled differently
        if (
          record.type === "chatMessage" ||
          record.type === "postMessage" ||
          record.type === "riuSetMessage" ||
          record.type === "riuSubmissionMessage" ||
          record.type === "utvVideoMessage" ||
          record.type === "biuSetMessage" ||
          record.type === "siuStackMessage"
        ) {
          return {
            ...prev,
            // TODO COLBY
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            messages: prev.messages.map((message: any) => {
              if (message.id === record.id) {
                return {
                  ...message,
                  likes: message.likes.filter(
                    // TODO COLBY
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (like: any) => like.user.id !== sessionUser.id,
                  ),
                };
              }
              return message;
            }),
          };
        }

        const likes = prev.likes.filter(
          // TODO COLBY
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (like: any) => like.userId !== sessionUser.id,
        );
        return {
          ...prev,
          likes,
        };
      });

      return {
        prev,
      };
    },
    onError: (error, _variables, context) => {
      toast.error(`Failed to unlike ${recordTypeToLabel[record.type]}`);
      console.error(error);
      if (context) {
        qc.setQueryData(optimisticUpdateQueryKey, context.prev);
      }
    },
    onSuccess: () => {
      if (refetchQueryKey) {
        qc.refetchQueries({ queryKey: refetchQueryKey });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: optimisticUpdateQueryKey });
    },
  });

  return {
    ...mutation,
    mutate: () => {
      mutation.mutate({
        data: {
          recordId: record.id,
          type: record.type,
        },
      });
    },
  };
}
