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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      qc.setQueryData(optimisticUpdateQueryKey, (prev: any) => {
        if (!prev) return prev;

        // chat message schemas are a little different so they need to be handled differently
        if (record.type === "chatMessage") {
          return {
            ...prev,
            messages: prev.messages.map((message) => {
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
                        avatarUrl: sessionUser.avatarUrl,
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
                avatarUrl: sessionUser.avatarUrl,
              },
            },
          ],
        };
      });

      return {
        prev,
      };
    },
    onError: (error, variables, context) => {
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
      qc.cancelQueries({ queryKey: optimisticUpdateQueryKey });

      invariant(sessionUser, "Not authenticated");

      const prev = qc.getQueryData(optimisticUpdateQueryKey);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      qc.setQueryData(optimisticUpdateQueryKey, (prev: any) => {
        if (!prev) return prev;

        // chat message schemas are a little different so they need to be handled differently
        if (record.type === "chatMessage") {
          return {
            ...prev,
            messages: prev.messages.map((message) => {
              if (message.id === record.id) {
                return {
                  ...message,
                  likes: message.likes.filter(
                    (like) => like.user.id !== sessionUser.id,
                  ),
                };
              }
              return message;
            }),
          };
        }

        const likes = prev.likes.filter(
          (like) => like.userId !== sessionUser.id,
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
    onError: (error, variables, context) => {
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
