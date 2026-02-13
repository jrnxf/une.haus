import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarIcon,
  CoinsIcon,
  LayersIcon,
  PlayIcon,
  RotateCcwIcon,
  UsersIcon,
} from "lucide-react";

import { LinkCard } from "~/components/link-card";
import { PageHeader } from "~/components/page-header";
import { games } from "~/lib/games";

export const Route = createFileRoute("/games/")({
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
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="text-muted-foreground size-4" />
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
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>games</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <LinkCard.Root href="/games/rius/active">
              <LinkCard.Header icon={CoinsIcon} title="Rack It Up" />
              <LinkCard.Content>
                <LinkCard.Description>
                  The original. Upload creative sets each week, submit responses
                  to others, and build through collaborative feedback.
                </LinkCard.Description>
                <div className="flex grow flex-col gap-2 border-t pt-4">
                  <StatRow
                    icon={PlayIcon}
                    value={activeRiu.sets.length}
                    label="active sets"
                  />
                  <StatRow
                    icon={UsersIcon}
                    value={riuParticipants}
                    label={riuParticipants === 1 ? "player" : "players"}
                  />
                  <StatRow
                    icon={CalendarIcon}
                    value={upcomingPlayers}
                    label="in next round"
                  />
                </div>
                <LinkCard.Cta label="View Game" />
              </LinkCard.Content>
            </LinkCard.Root>

            <LinkCard.Root href="/games/bius">
              <LinkCard.Header icon={RotateCcwIcon} title="Back It Up" />
              <LinkCard.Content>
                <LinkCard.Description>
                  Land the previous trick, then set a new one. Chain your skills
                  in an evolving line of creativity.
                </LinkCard.Description>
                <div className="flex grow flex-col gap-2 border-t pt-4">
                  <StatRow
                    icon={LayersIcon}
                    value={biusSets.length}
                    label={
                      biusSets.length === 1 ? "trick in chain" : "tricks in chain"
                    }
                  />
                  <StatRow
                    icon={UsersIcon}
                    value={biusParticipants}
                    label={biusParticipants === 1 ? "player" : "players"}
                  />
                </div>
                <LinkCard.Cta label="View Game" />
              </LinkCard.Content>
            </LinkCard.Root>

            <LinkCard.Root href="/games/sius">
              <LinkCard.Header icon={LayersIcon} title="Stack It Up" />
              <LinkCard.Content>
                <LinkCard.Description>
                  Complete the full stack of tricks, then add your own to the
                  end. Build on what came before.
                </LinkCard.Description>
                <div className="flex grow flex-col gap-2 border-t pt-4">
                  <StatRow
                    icon={LayersIcon}
                    value={siusStacks.length}
                    label={
                      siusStacks.length === 1
                        ? "trick in chain"
                        : "tricks in chain"
                    }
                  />
                  <StatRow
                    icon={UsersIcon}
                    value={siusParticipants}
                    label={siusParticipants === 1 ? "player" : "players"}
                  />
                </div>
                <LinkCard.Cta label="View Game" />
              </LinkCard.Content>
            </LinkCard.Root>
        </div>
      </div>
    </>
  );
}
