import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";

import { useSessionUser } from "~/lib/session/hooks";
import { users } from "~/lib/users";

export function useFollowMutations({ userId }: { userId: number }) {
  const qc = useQueryClient();

  const sessionUser = useSessionUser();

  const { mutate: follow } = useMutation({
    mutationFn: users.follow.fn,
    onMutate: () => {
      qc.cancelQueries({
        queryKey: users.get.queryOptions({ userId }).queryKey,
      });

      const prev = qc.getQueryData(users.get.queryOptions({ userId }).queryKey);

      qc.setQueryData(
        users.get.queryOptions({ userId }).queryKey,
        (previous) => {
          if (previous && sessionUser) {
            return {
              ...previous,
              followers: {
                count: previous.followers.count + 1,
                users: [
                  ...previous.followers.users,
                  {
                    avatarId: sessionUser.avatarId,
                    id: sessionUser.id,
                    name: sessionUser.name,
                    location: null, // this doesn't really matter
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
          users.get.queryOptions({ userId }).queryKey,
          context.previousData,
        );
        toast.error("Failed to follow user");
      }
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: users.get.queryOptions({ userId }).queryKey,
      });
    },
  });

  const { mutate: unfollow } = useMutation({
    mutationFn: users.unfollow.fn,
    onMutate: () => {
      qc.cancelQueries({
        queryKey: users.get.queryOptions({ userId }).queryKey,
      });

      const previousData = qc.getQueryData(
        users.get.queryOptions({ userId }).queryKey,
      );

      qc.setQueryData(
        users.get.queryOptions({ userId }).queryKey,
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
          users.get.queryOptions({ userId }).queryKey,
          context.previousData,
        );
        toast.error("Failed to unfollow user");
      }
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: users.get.queryOptions({ userId }).queryKey,
      });
    },
  });

  return { follow, unfollow };
}
