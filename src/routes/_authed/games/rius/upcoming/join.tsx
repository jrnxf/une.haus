import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { CreateRiuSetForm } from "~/components/forms/games/rius";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { games } from "~/lib/games";

export const Route = createFileRoute("/_authed/games/rius/upcoming/join")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      games.rius.upcoming.roster.queryOptions(),
    );
  },
});

function RouteComponent() {
  const { data } = useSuspenseQuery(games.rius.upcoming.roster.queryOptions());

  return (
    <div className="mx-auto flex w-full max-w-4xl grow overflow-hidden overflow-y-auto p-2">
      <ScrollArea
        className="flex w-full max-w-4xl grow overflow-hidden overflow-y-auto"
        id="main-content"
      >
        <div className="space-y-4 px-4">
          <h1>Join game</h1>
          {data.authUserSets && data.authUserSets.length === 3 ? (
            <>
              <p>You have already uploaded all the allowable sets!</p>
              <Button asChild>
                <Link to="/games/rius/upcoming">Back</Link>
              </Button>
            </>
          ) : (
            <CreateRiuSetForm />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
