import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LayersIcon, PlusIcon } from "lucide-react";

import pluralize from "pluralize";

import { StackUpForm } from "~/components/forms/games/sius";
import { ArchiveVoteButton } from "~/components/games/sius/archive-vote-button";
import { ChainStatusBanner } from "~/components/games/sius/chain-status-banner";
import { StackLineage } from "~/components/games/sius/stack-lineage";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { games } from "~/lib/games";
import { useIsAdmin, useSessionUser } from "~/lib/session/hooks";

export const Route = createFileRoute("/games/sius/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      games.sius.chain.active.queryOptions(),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: chain } = useSuspenseQuery(
    games.sius.chain.active.queryOptions(),
  );
  const sessionUser = useSessionUser();

  // No active chain - show start option
  if (!chain) {
    return <NoActiveChain />;
  }

  const stacks = chain.stacks ?? [];
  const latestStack = stacks[0]; // Already ordered by position desc
  const voteCount = chain.archiveVotes?.length ?? 0;
  const hasVoted =
    sessionUser &&
    chain.archiveVotes?.some((v) => v.user.id === sessionUser.id);

  const canStackUp =
    sessionUser &&
    latestStack &&
    latestStack.user.id !== sessionUser.id &&
    chain.status === "active";

  return (
    <div className="space-y-6">
      <ChainStatusBanner
        status={chain.status ?? "active"}
        chainLength={stacks.length}
        voteCount={voteCount}
      />

      {/* Stack action */}
      {latestStack && chain.status === "active" && (
        <div className="flex items-center gap-2">
          {canStackUp ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <LayersIcon className="mr-2 size-4" />
                  Stack It Up
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add to the Stack</DialogTitle>
                </DialogHeader>
                <StackUpForm parentStackId={latestStack.id} />
              </DialogContent>
            </Dialog>
          ) : sessionUser ? (
            latestStack.user.id === sessionUser.id ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button disabled>
                      <LayersIcon className="mr-2 size-4" />
                      Stack It Up
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  You can&apos;t stack your own trick
                </TooltipContent>
              </Tooltip>
            ) : null
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button disabled>
                    <LayersIcon className="mr-2 size-4" />
                    Stack It Up
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Sign in to stack it up</TooltipContent>
            </Tooltip>
          )}

          {sessionUser && (
            <>
              <ArchiveVoteButton
                chainId={chain.id}
                voteCount={voteCount}
                hasVoted={!!hasVoted}
              />
              {voteCount > 0 && (
                <span className="text-muted-foreground text-xs">
                  {voteCount}/5 to archive
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Stack lineage */}
      <div className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          The Line ({stacks.length} {pluralize("trick", stacks.length)})
        </h2>
        <StackLineage stacks={stacks} />
      </div>
    </div>
  );
}

function NoActiveChain() {
  const isAdmin = useIsAdmin();

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-6 py-10 text-center">
          <div className="bg-muted flex size-16 items-center justify-center rounded-full">
            <LayersIcon className="text-muted-foreground size-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">No Active Stack</h2>
            <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
              There&apos;s no active stack right now. Check back soon for a new
              challenge!
            </p>
          </div>

          <div className="bg-muted/50 w-full rounded-lg p-4">
            <h3 className="mb-2 text-sm font-medium">How it works</h3>
            <ol className="text-muted-foreground space-y-1 text-left text-sm">
              <li>1. An admin starts a stack with the first trick</li>
              <li>2. Someone lands that trick and adds a new one</li>
              <li>3. Next person lands BOTH tricks and adds another</li>
              <li>
                4. Line grows - each person must land ALL previous tricks!
              </li>
            </ol>
          </div>

          {isAdmin && (
            <Button asChild>
              <Link to="/games/sius/start">
                <PlusIcon className="mr-2 size-4" />
                Start a Stack
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
