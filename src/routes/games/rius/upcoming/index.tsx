import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Badges } from "~/components/badges";
import { DeleteSetButton } from "~/components/delete-set-button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { VideoPlayer } from "~/components/video-player";
import { games } from "~/lib/games";
import { useSessionUser } from "~/lib/session/hooks";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/games/rius/upcoming/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      games.rius.upcoming.roster.queryOptions(),
    );
  },
});

function RouteComponent() {
  const { data } = useSuspenseQuery(games.rius.upcoming.roster.queryOptions());
  const user = useSessionUser();

  const playerRoster = Object.values(data.roster);
  const isUserInGame = user && data.roster[user.id];
  const hasUserSets = data.authUserSets && data.authUserSets.length > 0;
  const shouldShowEmptyState = (!user || !isUserInGame) && !hasUserSets;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold">Next Game Roster</h2>
        {playerRoster.length === 0 ? (
          <p className="text-muted-foreground mt-1">No players yet</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {playerRoster.map((user) => (
              <Link
                key={user.id}
                to="/users/$userId"
                params={{ userId: user.id }}
                className={cn(
                  "w-full space-y-2 rounded-md border bg-white p-3 text-left dark:bg-[#0a0a0a]",
                  "ring-offset-background",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
                )}
              >
                <div className="flex items-center gap-2">
                  <Avatar
                    className="size-6 rounded-full"
                    cloudflareId={user.avatarId}
                    alt={user.name}
                  >
                    <AvatarImage width={24} quality={85} />
                    <AvatarFallback className="text-xs" name={user.name} />
                  </Avatar>
                  <p className="truncate text-base">{user.name}</p>
                  {user.count > 1 && (
                    <span className="text-muted-foreground text-xs">
                      {user.count} sets
                    </span>
                  )}
                </div>
                {user.bio && (
                  <p className="text-muted-foreground line-clamp-3 text-sm">
                    {user.bio}
                  </p>
                )}
                <Badges content={user.disciplines} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {data.authUserSets?.map((set) => (
        <div
          className="rounded-lg border bg-white p-4 dark:bg-[#0a0a0a]"
          key={set.id}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="line-clamp-1 text-lg">{set.name}</h3>
              {set.instructions && (
                <p className="text-muted-foreground line-clamp-2 text-sm">
                  {set.instructions}
                </p>
              )}
            </div>
            <div className="flex shrink-0 justify-end gap-1">
              <Button asChild size="icon-sm" variant="ghost">
                {/* <Link to="/games/rius/sets/$setId/edit" params={{ setId: set.id }}>
                  <PenIcon className="size-4" />
                </Link> */}
              </Button>
              <DeleteSetButton setId={set.id} />
            </div>
          </div>
          <div className="mt-4">
            {set.video.playbackId && (
              <VideoPlayer playbackId={set.video.playbackId} />
            )}
          </div>
        </div>
      ))}

      {data.authUserSets && data.authUserSets.length === 3 ? (
        <p>You have already uploaded all the allowable sets!</p>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <Separator className="shrink" />
          <Button asChild className="border-dashed" variant="outline">
            <Link to="/games/rius/upcoming/join">
              Upload set {(data.authUserSets?.length ?? 0) + 1} of 3
            </Link>
          </Button>
          <Separator className="shrink" />
        </div>
      )}

      {shouldShowEmptyState && (
        <Card className="border-dashed p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            {/* <AnimatedGhost /> */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium">You?</h3>
              <p className="text-muted-foreground text-sm">
                {user
                  ? "Join the game to be part of the next RIU"
                  : "Sign in to join the upcoming game"}
              </p>
            </div>
            <Button asChild>
              <Link to={user ? "/games/rius/upcoming/join" : "/auth/code/send"}>
                {user ? "Join Game" : "Sign In"}
              </Link>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
