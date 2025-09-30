import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { toast } from "sonner";

import { games } from "~/lib/games";
import { useSessionUser } from "~/lib/session/hooks";

export function useCreateSet() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const upcomingRosterQueryKey =
    games.rius.upcoming.roster.queryOptions().queryKey;

  return useMutation({
    mutationFn: games.rius.sets.create.fn,
    onMutate: () => {
      qc.cancelQueries({
        queryKey: upcomingRosterQueryKey,
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
        queryKey: upcomingRosterQueryKey,
      });

      navigate({ to: "/games/rius/upcoming" });
    },
  });
}

export function useAdminRotateRius() {
  return useMutation({
    mutationFn: games.rius.admin.rotate.fn,
    onSuccess: () => {
      toast.success("Rius rotated");
    },
  });
}

export function useCreateSubmission() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: games.rius.submissions.create.fn,
    onSuccess: (data) => {
      toast.success("Submission uploaded", {
        action: {
          label: "View",
          onClick: () => {
            navigate({ to: `/games/rius/submissions/${data.id}` });
          },
        },
      });
    },
    onError: (error) => {
      toast.error("Failed to create submission");
      console.error(error);
    },
  });
}

export function useDeleteSet() {
  const sessionUser = useSessionUser();

  const qc = useQueryClient();

  const upcomingRosterQueryKey =
    games.rius.upcoming.roster.queryOptions().queryKey;

  return useMutation({
    mutationFn: games.rius.sets.delete.fn,
    onMutate: ({ data: { riuSetId } }) => {
      qc.cancelQueries({
        queryKey: upcomingRosterQueryKey,
      });

      const previousData = qc.getQueryData(upcomingRosterQueryKey);

      qc.setQueryData(upcomingRosterQueryKey, (previous) => {
        const nextAuthUserSets =
          previous?.authUserSets?.filter((set) => set.id !== riuSetId) ?? [];

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
        queryKey: upcomingRosterQueryKey,
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
