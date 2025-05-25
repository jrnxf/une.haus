import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useSessionUser } from "~/lib/session";
import { createRiuSet, deleteRiuSet } from "~/server/fns/games/rius/sets";

export function useCreateSet() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: createRiuSet.serverFn,
    onMutate: () => {
      qc.cancelQueries({
        queryKey: QUERY_KEYS.GAMES_RIU_UPCOMING_ROSTER,
      });
    },
    onSuccess: () => {
      toast.success("Set created");

      // https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5#hydration-api-changes
      // https://github.com/TanStack/query/discussions/3169#discussioncomment-12437333
      // to avoid flashing stale data due to hydration now happening in an
      // effect, removing the query before redirecting means the prefetched
      // value in the RSC will be used immediately
      qc.removeQueries({
        queryKey: QUERY_KEYS.GAMES_RIU_UPCOMING_ROSTER,
      });

      navigate({ to: "/games/rius/upcoming" });
    },
  });
}

// export function useCreateSubmission() {
//   const qc = useQueryClient();

//   return api.games.createRiuSubmission.useMutation({
//     onError: (error) => {
//       toast.error("Failed to create submission");
//       console.error(error);
//     },
//     onSuccess: () => {
//       toast.success("Submission created");
//       qc.refetchQueries({
//         queryKey: getQueryKey(api.games.listRiuSets, "active"),
//       });
//     },
//   });
// }

export function useDeleteSet() {
  const sessionUser = useSessionUser();

  const qc = useQueryClient();

  return useMutation({
    mutationFn: deleteRiuSet.serverFn,
    onMutate: ({ data: { setId } }) => {
      qc.cancelQueries({
        queryKey: QUERY_KEYS.GAMES_RIU_UPCOMING_ROSTER,
      });

      const previousData = qc.getQueryData(
        QUERY_KEYS.GAMES_RIU_UPCOMING_ROSTER,
      );

      qc.setQueryData(QUERY_KEYS.GAMES_RIU_UPCOMING_ROSTER, (previous) => {
        const nextAuthUserSets =
          previous?.authUserSets?.filter((set) => set.id !== setId) ?? [];

        const nextRoster = { ...previous?.roster };
        if (sessionUser && nextAuthUserSets.length === 0) {
          delete nextRoster[sessionUser!.id];
        }

        return {
          authUserSets: nextAuthUserSets,
          roster: nextRoster,
        };
      });

      return { previousData };
    },
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: QUERY_KEYS.GAMES_RIU_UPCOMING_ROSTER,
      }),
    onSuccess: () => {
      toast.success("Set deleted");
    },
  });
}

// export function useEditSet() {
//   const navigate = useNavigate()
//   const utilities = api.useUtils();

//   const qc = useQueryClient();

//   return api.games.editRiuSet.useMutation({
//     onMutate: () => {
//       utilities.games.listUpcomingRiuRoster.cancel();
//     },
//     onSuccess: () => {
//       toast.success("Set updated");
//       // https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5#hydration-api-changes
//       // https://github.com/TanStack/query/discussions/3169#discussioncomment-12437333
//       // to avoid flashing stale data due to hydration now happening in an
//       // effect, removing the query before redirecting means the prefetched
//       // value in the RSC will be used immediately
//       qc.removeQueries({
//         queryKey: getQueryKey(api.games.listUpcomingRiuRoster),
//       });
//       navigate({ to: "/games/rius/upcoming" });
//     },
//   });
// }
