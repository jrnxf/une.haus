import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { getMuxPoster, VideoPlayer } from "~/components/video-player";
import { Json } from "~/lib/dx/json";
import { games } from "~/lib/games";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/games/rius/active")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      games.rius.active.list.queryOptions(),
    );
  },
});

function RouteComponent() {
  const { data } = useSuspenseQuery(games.rius.active.list.queryOptions());

  if (!data?.sets.length) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Active RIUs</h1>
          <p className="text-muted-foreground mt-2">
            No active RIUs available.
          </p>
        </div>
      </div>
    );
  }

  // Group sets by user elegantly
  const groupedSets = useMemo(() => {
    const groups: Record<
      number,
      { user: (typeof data.sets)[0]["user"]; sets: typeof data.sets }
    > = {};

    for (const set of data.sets) {
      const userId = set.user.id;
      const existing = groups[userId];
      if (existing) {
        existing.sets.push(set);
      } else {
        groups[userId] = {
          user: set.user,
          sets: [set],
        };
      }
    }

    return groups;
  }, [data.sets]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <h1 className="text-2xl font-bold">Active RIUs</h1>
      <div className="flex flex-col gap-6">
        {Object.entries(groupedSets).map(([userName, { user, sets }]) => (
          <div key={userName} className="space-y-3">
            {/* User header */}
            <div className="border-border flex items-center gap-3 border-b pb-2">
              <Avatar className="size-8 rounded-full">
                <AvatarFallback className="text-sm" name={user.name} />
              </Avatar>
              <h2 className="text-lg font-semibold">{user.name}</h2>
            </div>

            {/* Sets for this user */}
            <div className="grid grid-cols-1 gap-3 pl-2 md:grid-cols-3">
              {sets.map((set) => (
                <Link
                  params={{ setId: set.id }}
                  to="/games/rius/sets/$setId"
                  key={set.id}
                  className={cn(
                    "space-y-3 rounded-md border bg-white p-3 text-left dark:bg-[#0a0a0a]",
                  )}
                >
                  <p className="truncate text-base font-medium">{set.name}</p>
                  {set.video?.playbackId && (
                    <img
                      alt=""
                      src={getMuxPoster(set.video.playbackId)}
                      className="aspect-video object-cover"
                    />
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
