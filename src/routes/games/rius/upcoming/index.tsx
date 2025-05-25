import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DeleteSetButton } from "~/components/delete-set-button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { VideoPlayer } from "~/components/video-player";
import { games } from "~/lib/games";

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

  const playerRoster = Object.values(data.roster);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
      <div>
        <p>Next Game Roster</p>
        {playerRoster.length === 0 ? (
          <p className="text-muted-foreground mt-1">No players yet</p>
        ) : (
          <div className="flex flex-col items-start">
            {playerRoster.map((user) => (
              <Button
                asChild
                className="w-max justify-start"
                key={user.id}
                size="sm"
                variant="ghost"
              >
                <Link to="/users/$userId" params={{ userId: user.id }}>
                  <Avatar className="size-6 rounded-lg">
                    <AvatarImage alt={user.name} src={user.avatarUrl} />
                    <AvatarFallback name={user.name} />
                  </Avatar>
                  {user.name}
                </Link>
              </Button>
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
              {set.description && (
                <p className="text-muted-foreground line-clamp-2 text-sm">
                  {set.description}
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
    </div>
  );
}
