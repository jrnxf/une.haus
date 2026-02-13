import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PlusIcon, UsersIcon } from "lucide-react";

import { Badges } from "~/components/badges";
import { DeleteSetButton } from "~/components/delete-set-button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
  const userSetsCount = data.authUserSets?.length ?? 0;
  const canUploadMore = userSetsCount < 3;

  return (
    <div className="space-y-6">
      {/* My Sets Section - Show first if user has sets */}
      {hasUserSets && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Your Sets</h2>
              <p className="text-muted-foreground text-sm">
                {userSetsCount} of 3 uploaded
              </p>
            </div>
            {canUploadMore && (
              <Button size="sm" variant="outline" className="gap-1.5" asChild>
                <Link to="/games/rius/upcoming/join">
                  <PlusIcon className="size-4" />
                  Add Set
                </Link>
              </Button>
            )}
          </div>

          <div className="grid gap-4">
            {data.authUserSets?.map((set) => (
              <Card key={set.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">
                        {set.name}
                      </CardTitle>
                      {set.instructions && (
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                          {set.instructions}
                        </p>
                      )}
                    </div>
                    <DeleteSetButton setId={set.id} />
                  </div>
                </CardHeader>
                {set.video.playbackId && (
                  <CardContent className="pt-0">
                    <VideoPlayer playbackId={set.video.playbackId} />
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Roster Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <UsersIcon className="text-muted-foreground size-5" />
          <div>
            <h2 className="text-lg font-semibold">next round roster</h2>
            <p className="text-muted-foreground text-sm">
              {playerRoster.length}{" "}
              {playerRoster.length === 1 ? "player" : "players"} joined
            </p>
          </div>
        </div>

        {playerRoster.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                <UsersIcon className="text-muted-foreground size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium">No players yet</h3>
                <p className="text-muted-foreground text-sm">
                  Be the first to join the next round!
                </p>
              </div>
              {!user ||
                (!isUserInGame && (
                  <Button asChild>
                    <Link to="/games/rius/upcoming/join">Join Game</Link>
                  </Button>
                ))}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {playerRoster.map((player) => (
              <Link
                key={player.id}
                to="/users/$userId"
                params={{ userId: player.id }}
                className={cn(
                  "group bg-card flex items-start gap-3 rounded-lg border p-3 transition-all",
                  "hover:border-primary/30 hover:shadow-sm",
                )}
              >
                <Avatar
                  className="size-10 shrink-0 rounded-full"
                  cloudflareId={player.avatarId}
                  alt={player.name}
                >
                  <AvatarImage width={40} quality={85} />
                  <AvatarFallback className="text-sm" name={player.name} />
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="group-hover:text-primary truncate font-medium">
                      {player.name}
                    </p>
                    {player.count > 1 && (
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {player.count} sets
                      </span>
                    )}
                  </div>
                  {player.bio && (
                    <p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
                      {player.bio}
                    </p>
                  )}
                  {player.disciplines && (
                    <div className="mt-1.5">
                      <Badges content={player.disciplines} />
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
