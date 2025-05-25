import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useSessionUser } from "~/lib/session/hooks";
import { users } from "~/lib/users";

export function useFollows({ userId }: { userId: number }) {
  const { data } = useSuspenseQuery(users.follows.queryOptions({ userId }));

  const qc = useQueryClient();

  const { isPending: isFollowing, mutate: follow } = useMutation({
    mutationFn: users.follow.fn,
    onMutate: () => {
      qc.cancelQueries({
        queryKey: users.follows.queryOptions({ userId }).queryKey,
      });

      const prev = qc.getQueryData(
        users.follows.queryOptions({ userId }).queryKey,
      );

      qc.setQueryData(
        users.follows.queryOptions({ userId }).queryKey,
        (previous) => {
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
        },
      );

      return { previousData: prev };
    },
    onError: (error, _variables, context) => {
      console.error(error);
      if (context) {
        qc.setQueryData(
          users.follows.queryOptions({ userId }).queryKey,
          context.previousData,
        );
        toast.error("Failed to follow user");
      }
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: users.follows.queryOptions({ userId }).queryKey,
      });
    },
  });

  const { isPending: isUnfollowing, mutate: unfollow } = useMutation({
    mutationFn: users.unfollow.fn,
    onMutate: () => {
      qc.cancelQueries({
        queryKey: users.follows.queryOptions({ userId }).queryKey,
      });

      const previousData = qc.getQueryData(
        users.follows.queryOptions({ userId }).queryKey,
      );

      qc.setQueryData(
        users.follows.queryOptions({ userId }).queryKey,
        (previous) => {
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
        },
      );

      return { previousData };
    },
    onError: (error, _variables, context) => {
      console.error(error);
      if (context) {
        qc.setQueryData(
          users.follows.queryOptions({ userId }).queryKey,
          context.previousData,
        );
        toast.error("Failed to unfollow user");
      }
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: users.follows.queryOptions({ userId }).queryKey,
      });
    },
  });

  const sessionUser = useSessionUser();

  const authUserFollowsUser = data.followers.users.some(
    (user) => user.id === sessionUser?.id,
  );

  const action = authUserFollowsUser ? unfollow : follow;
  const isPending = authUserFollowsUser ? isUnfollowing : isFollowing;

  return { action, authUserFollowsUser, data, isPending };
}
