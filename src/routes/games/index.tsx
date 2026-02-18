import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

// import {
//   CalendarIcon,
//   CoinsIcon,
//   LayersIcon,
//   PlayIcon,
//   RotateCcwIcon,
//   UsersIcon,
// } from "lucide-react";

import { LinkCard } from "~/components/link-card";
import { games } from "~/lib/games";

export const Route = createFileRoute("/games/")({
  staticData: {
    pageHeader: { breadcrumbs: [{ label: "games" }], maxWidth: "4xl" },
  },
  component: RouteComponent,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        games.rius.active.list.queryOptions(),
      ),
      context.queryClient.ensureQueryData(
        games.rius.upcoming.roster.queryOptions(),
      ),
      context.queryClient.ensureQueryData(
        games.bius.chain.active.queryOptions(),
      ),
      context.queryClient.ensureQueryData(
        games.sius.chain.active.queryOptions(),
      ),
    ]);
  },
});

function StatRow({
  // icon: Icon,
  value,
  label,
}: {
  // icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {/* <Icon className="text-muted-foreground size-4" /> */}
      <p className="text-muted-foreground text-xs">
        <span className="text-foreground font-medium">{value}</span> {label}
      </p>
    </div>
  );
}

function RouteComponent() {
  const { data: activeRiu } = useSuspenseQuery(
    games.rius.active.list.queryOptions(),
  );
  const { data: upcomingRoster } = useSuspenseQuery(
    games.rius.upcoming.roster.queryOptions(),
  );
  const { data: biusChain } = useSuspenseQuery(
    games.bius.chain.active.queryOptions(),
  );
  const { data: siusChain } = useSuspenseQuery(
    games.sius.chain.active.queryOptions(),
  );

  const riuParticipants = new Set(activeRiu.sets.map((s) => s.user.id)).size;
  const upcomingPlayers = Object.keys(upcomingRoster.roster).length;

  const biusSets = biusChain?.sets ?? [];
  const biusParticipants = new Set(biusSets.map((s) => s.user.id)).size;

  const siusStacks = siusChain?.stacks ?? [];
  const siusParticipants = new Set(siusStacks.map((s) => s.user.id)).size;

  return (
    <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <LinkCard.Root href="/games/rius/active">
          {/* <LinkCard.Header icon={CoinsIcon} title="rack it up" /> */}
          <LinkCard.Header title="rack it up" />
          <LinkCard.Content>
            <LinkCard.Description>
              the original. post creative sets weekly, reply to others, and grow
              via feedback.
            </LinkCard.Description>
            {/* <div className="flex grow flex-col gap-2 border-t pt-4">
                <StatRow
                  value={activeRiu.sets.length}
                  label="active sets"
                />
                <StatRow
                  value={riuParticipants}
                  label={riuParticipants === 1 ? "player" : "players"}
                />
              </div>
              <div className="flex items-center justify-between">
                <StatRow
                  value={upcomingPlayers}
                  label="in next round"
                />
                <LinkCard.Cta label="enter" />
              </div> */}
            <LinkCard.Cta label="enter" />
          </LinkCard.Content>
        </LinkCard.Root>

        <LinkCard.Root href="/games/bius">
          {/* <LinkCard.Header icon={RotateCcwIcon} title="back it up" /> */}
          <LinkCard.Header title="back it up" />
          <LinkCard.Content>
            <LinkCard.Description>
              match the last trick, then set a new one. build an evolving chain
              of creativity.
            </LinkCard.Description>
            {/* <div className="flex grow flex-col gap-2 border-t pt-4">
                <StatRow
                  value={biusSets.length}
                  label={
                    biusSets.length === 1 ? "trick in chain" : "tricks in chain"
                  }
                />
                <StatRow
                  value={biusParticipants}
                  label={biusParticipants === 1 ? "player" : "players"}
                />
              </div> */}
            <LinkCard.Cta label="enter" />
          </LinkCard.Content>
        </LinkCard.Root>

        <LinkCard.Root href="/games/sius">
          {/* <LinkCard.Header icon={LayersIcon} title="stack it up" /> */}
          <LinkCard.Header title="stack it up" />
          <LinkCard.Content>
            <LinkCard.Description>
              nail every trick in the stack then add your own to the end. keep
              the line going.
            </LinkCard.Description>
            {/* <div className="flex grow flex-col gap-2 border-t pt-4">
                <StatRow
                  value={siusStacks.length}
                  label={
                    siusStacks.length === 1
                      ? "trick in chain"
                      : "tricks in chain"
                  }
                />
                <StatRow
                  value={siusParticipants}
                  label={siusParticipants === 1 ? "player" : "players"}
                />
              </div> */}
            <LinkCard.Cta label="enter" />
          </LinkCard.Content>
        </LinkCard.Root>
      </div>
    </div>
  );
}
