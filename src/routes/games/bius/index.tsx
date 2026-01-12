import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PlusIcon, RotateCcwIcon } from "lucide-react";

import { BackUpSetForm } from "~/components/forms/games/bius";
import { ChainStatusBanner, SetLineage } from "~/components/games/bius";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { games } from "~/lib/games";
import { useIsAdmin, useSessionUser } from "~/lib/session/hooks";

export const Route = createFileRoute("/games/bius/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      games.bius.chain.active.queryOptions(),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: chain } = useSuspenseQuery(
    games.bius.chain.active.queryOptions(),
  );
  const sessionUser = useSessionUser();

  // No active chain - show start option
  if (!chain) {
    return <NoActiveChain />;
  }

  const sets = chain.sets ?? [];
  const latestSet = sets[0]; // Already ordered by position desc
  const canBackUp =
    sessionUser &&
    latestSet &&
    latestSet.user.id !== sessionUser.id &&
    chain.status === "active" &&
    !latestSet.flaggedAt;

  return (
    <div className="space-y-6">
      <ChainStatusBanner
        status={chain.status ?? "active"}
        chainLength={sets.length}
      />

      {/* Latest set to back up */}
      {latestSet && chain.status === "active" && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Back This Set Up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
                  <RotateCcwIcon className="size-5" />
                </div>
                <div>
                  <p className="font-medium">{latestSet.name}</p>
                  <p className="text-muted-foreground text-sm">
                    by {latestSet.user.name}
                  </p>
                </div>
              </div>
            </div>

            {canBackUp ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <RotateCcwIcon className="mr-2 size-4" />
                    Back It Up
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Back Up: {latestSet.name}</DialogTitle>
                  </DialogHeader>
                  <BackUpSetForm parentSetId={latestSet.id} />
                </DialogContent>
              </Dialog>
            ) : !sessionUser ? (
              <p className="text-muted-foreground text-center text-sm">
                Sign in to back up this set
              </p>
            ) : latestSet.user.id === sessionUser.id ? (
              <p className="text-muted-foreground text-center text-sm">
                You can&apos;t back up your own set. Wait for someone else!
              </p>
            ) : latestSet.flaggedAt ? (
              <p className="text-muted-foreground text-center text-sm">
                This set is flagged and under review
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Chain lineage */}
      <div className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          Chain History ({sets.length} {sets.length === 1 ? "set" : "sets"})
        </h2>
        <SetLineage sets={sets} />
      </div>
    </div>
  );
}

function NoActiveChain() {
  const isAdmin = useIsAdmin();

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-md border-dashed">
        <CardContent className="flex flex-col items-center gap-6 py-10 text-center">
          <div className="bg-muted flex size-16 items-center justify-center rounded-full">
            <RotateCcwIcon className="text-muted-foreground size-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">No Active Chain</h2>
            <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
              There&apos;s no active chain right now. Check back soon for a new
              challenge to back up!
            </p>
          </div>

          <div className="bg-muted/50 w-full rounded-lg p-4">
            <h3 className="mb-2 text-sm font-medium">How it works</h3>
            <ol className="text-muted-foreground space-y-1 text-left text-sm">
              <li>1. An admin starts a chain with a set</li>
              <li>2. Someone lands that set and adds a new one</li>
              <li>3. Next person backs that up and sets another</li>
              <li>4. Chain continues until someone can&apos;t land it!</li>
            </ol>
          </div>

          {isAdmin && (
            <Button asChild>
              <Link to="/games/bius/start">
                <PlusIcon className="mr-2 size-4" />
                Start a Chain
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
