import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { CreateRiuSetForm } from "~/components/forms/games/rius";
import { Button } from "~/components/ui/button";
import { games } from "~/lib/games";

export const Route = createFileRoute("/_authed/games/rius/upcoming/join")({
  staticData: {
    pageHeader: {
      breadcrumbs: [
        { label: "games", to: "/games" },
        { label: "rack it up", to: "/games/rius/upcoming" },
        { label: "join" },
      ],
      maxWidth: "2xl",
    },
  },
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
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">upload set</h1>
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
  );
}
