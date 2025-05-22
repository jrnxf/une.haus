import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "~/integrations/trpc/react";
import { useSessionUser } from "~/lib/session";

export function useFollows({ userId }: { userId: number }) {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.user.follows.queryOptions({ userId }));

  const qc = useQueryClient();

  const { isPending: isFollowing, mutate: follow } = useMutation(
    trpc.user.follow.mutationOptions({
      onMutate: () => {
        qc.cancelQueries({
          queryKey: trpc.user.follows.queryKey({ userId }),
        });

        const prev = qc.getQueryData(trpc.user.follows.queryKey({ userId }));

        qc.setQueryData(trpc.user.follows.queryKey({ userId }), (previous) => {
          if (previous && sessionUser) {
            return {
              ...previous,
              followers: {
                count: previous.followers.count + 1,
                users: [
                  ...previous.followers.users,
                  {
                    avatarUrl: sessionUser.avatarUrl,
                    id: sessionUser.id,
                    name: sessionUser.name,
                  },
                ],
              },
            };
          }
        });

        return { previousData: prev };
      },
      onError: (error, _variables, context) => {
        console.error(error);
        if (context) {
          qc.setQueryData(
            trpc.user.follows.queryKey({ userId }),
            context.previousData,
          );
          toast.error("Failed to follow user");
        }
      },
      onSettled: () => {
        qc.invalidateQueries({
          queryKey: trpc.user.follows.queryKey({ userId }),
        });
      },
    }),
  );

  const { isPending: isUnfollowing, mutate: unfollow } = useMutation(
    trpc.user.unfollow.mutationOptions({
      onMutate: () => {
        qc.cancelQueries({
          queryKey: trpc.user.follows.queryKey({ userId }),
        });

        const previousData = qc.getQueryData(
          trpc.user.follows.queryKey({ userId }),
        );

        qc.setQueryData(trpc.user.follows.queryKey({ userId }), (previous) => {
          if (previous && sessionUser) {
            return {
              ...previous,
              followers: {
                count: previous.followers.count - 1,
                users: previous.followers.users.filter(
                  (user) => user.id !== sessionUser.id,
                ),
              },
            };
          }
        });

        return { previousData };
      },
      onError: (error, _variables, context) => {
        console.error(error);
        if (context) {
          qc.setQueryData(
            trpc.user.follows.queryKey({ userId }),
            context.previousData,
          );
          toast.error("Failed to unfollow user");
        }
      },
      onSettled: () => {
        qc.invalidateQueries({
          queryKey: trpc.user.follows.queryKey({ userId }),
        });
      },
    }),
  );

  const sessionUser = useSessionUser();

  const authUserFollowsUser = data.followers.users.some(
    (user) => user.id === sessionUser?.id,
  );

  const action = authUserFollowsUser ? unfollow : follow;
  const isPending = authUserFollowsUser ? isUnfollowing : isFollowing;

  return { action, authUserFollowsUser, data, isPending };
}
