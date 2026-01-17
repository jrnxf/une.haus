import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";

import { StartChainForm } from "~/components/forms/games/bius";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { games } from "~/lib/games";

export const Route = createFileRoute("/games/bius/start")({
  loader: async ({ context }) => {
    // Admin only
    if (!context.session.user || context.session.user.id !== 1) {
      throw redirect({
        to: "/games/bius",
      });
    }

    // Check if there's already an active chain
    const chain = await context.queryClient.ensureQueryData(
      games.bius.chain.active.queryOptions(),
    );

    // If there's an active chain, redirect to the main page
    if (chain) {
      throw redirect({
        to: "/games/bius",
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  // Double-check no active chain
  const { data: chain } = useSuspenseQuery(
    games.bius.chain.active.queryOptions(),
  );

  if (chain) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          A chain is already active.{" "}
          <Link to="/games/bius" className="text-primary underline">
            View it here
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/games/bius">
          <ArrowLeftIcon className="size-4" />
          Back
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Start a New Chain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-2">
            <p className="text-muted-foreground text-sm">
              You&apos;re about to start a new Back It Up chain! Upload a video
              of yourself performing a set - this will be the first link in the
              chain.
            </p>
            <p className="text-muted-foreground text-sm">
              Others will need to land your set and add their own to continue
              the chain.
            </p>
          </div>

          <StartChainForm />
        </CardContent>
      </Card>
    </div>
  );
}
