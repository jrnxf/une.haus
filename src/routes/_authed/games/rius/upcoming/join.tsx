import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { CreateRiuSetForm } from "~/components/forms/games/rius";
import { Button } from "~/components/ui/button";
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
    <div className="flex grow flex-col overflow-hidden px-1">
      <div className="overflow-y-auto" id="main-content">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3 p-3">
          <h1 className="text-xl leading-loose font-semibold">Upload set</h1>
          {data.authUserSets && data.authUserSets.length === 3 ? (
            <>
              <p>you have already uploaded all the allowable sets!</p>
              <Button asChild>
                <Link to="/games/rius/upcoming">back</Link>
              </Button>
            </>
          ) : (
            <CreateRiuSetForm />
          )}
        </div>
      </div>
    </div>
  );
}
