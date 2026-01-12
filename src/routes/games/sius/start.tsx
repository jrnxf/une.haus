import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";

import { StartChainForm } from "~/components/forms/games/sius";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { games } from "~/lib/games";

export const Route = createFileRoute("/games/sius/start")({
  loader: async ({ context }) => {
    // Admin only (hardcoded check - same as BIUS)
    if (!context.session.user || context.session.user.id !== 1) {
      throw redirect({
        to: "/games/sius",
      });
    }

    // Check if there's already an active chain
    const chain = await context.queryClient.ensureQueryData(
      games.sius.chain.active.queryOptions(),
    );

    // If there's an active chain, redirect to the main page
    if (chain) {
      throw redirect({
        to: "/games/sius",
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  // Double-check no active chain
  const { data: chain } = useSuspenseQuery(
    games.sius.chain.active.queryOptions(),
  );

  if (chain) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          A stack is already active.{" "}
          <Link to="/games/sius" className="text-primary underline">
            View it here
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/games/sius">
          <ArrowLeftIcon className="mr-1.5 size-4" />
          Back
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Start a New Stack</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-2">
            <p className="text-muted-foreground text-sm">
              You&apos;re about to start a new Stack It Up chain! Upload a video
              of yourself performing a trick - this will be the first trick in
              the line.
            </p>
            <p className="text-muted-foreground text-sm">
              Others will need to land your trick AND add their own to continue
              the stack. Each person after that must land ALL previous tricks
              before adding theirs.
            </p>
          </div>

          <StartChainForm />
        </CardContent>
      </Card>
    </div>
  );
}
