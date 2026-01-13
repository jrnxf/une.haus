import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  BarChart3Icon,
  CalendarIcon,
  LayersIcon,
  PlayIcon,
  RotateCcwIcon,
  UsersIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { games } from "~/lib/games";
import { cn } from "~/lib/utils";

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

type GameStatus = "active" | "coming-soon";

type GameCardProps = {
  name: string;
  description: string;
  status: GameStatus;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  stats?: {
    activeSets?: number;
    chainLength?: number;
    participants?: number;
    upcomingPlayers?: number;
  };
};

function GameCard({
  name,
  description,
  status,
  href,
  icon: Icon,
  stats,
}: GameCardProps) {
  const isActive = status === "active";

  return (
    <Link to={href} className="block h-full">
      <Card
        className={cn(
          "group relative flex h-full flex-col overflow-hidden transition-all",
          "cursor-pointer border-dashed",
          "focus-within:scale-[1.01] hover:scale-[1.01]",
          !isActive && "opacity-70",
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-lg",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
            </div>
            <CardTitle className="text-lg">{name}</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="flex grow flex-col space-y-4">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>

          <div className="flex grow flex-col gap-2 border-t pt-4">
            {isActive && stats ? (
              <>
                {stats.activeSets !== undefined && (
                  <div className="flex items-center gap-2">
                    <PlayIcon className="text-muted-foreground size-4" />
                    <p className="text-muted-foreground text-xs">
                      <span className="text-foreground font-medium">
                        {stats.activeSets}
                      </span>{" "}
                      active sets
                    </p>
                  </div>
                )}
                {stats.chainLength !== undefined && (
                  <div className="flex items-center gap-2">
                    <LayersIcon className="text-muted-foreground size-4" />
                    <p className="text-muted-foreground text-xs">
                      <span className="text-foreground font-medium">
                        {stats.chainLength}
                      </span>{" "}
                      {stats.chainLength === 1 ? "trick" : "tricks"} in chain
                    </p>
                  </div>
                )}
                {stats.participants !== undefined && (
                  <div className="flex items-center gap-2">
                    <UsersIcon className="text-muted-foreground size-4" />
                    <p className="text-muted-foreground text-xs">
                      <span className="text-foreground font-medium">
                        {stats.participants}
                      </span>{" "}
                      {stats.participants === 1 ? "player" : "players"}
                    </p>
                  </div>
                )}
                {stats.upcomingPlayers !== undefined && (
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="text-muted-foreground size-4" />
                    <p className="text-muted-foreground text-xs">
                      <span className="text-foreground font-medium">
                        {stats.upcomingPlayers}
                      </span>{" "}
                      in next round
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-xs italic">
                Coming soon
              </p>
            )}
          </div>

          <div className="flex items-center justify-end">
            <span className="text-muted-foreground group-hover:text-foreground flex items-center gap-1 text-sm transition-colors">
              {isActive ? "View Game" : "Learn More"}
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
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
    <div className="flex grow flex-col overflow-hidden">
      <div className="overflow-y-auto" id="main-content">
        <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
          <div className="mb-8 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Games</h1>
            <p className="text-muted-foreground text-sm">
              Collaborative creative challenges
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <GameCard
              name="Rack It Up"
              description="The original. Upload creative sets each week, submit responses to others, and build through collaborative feedback."
              status="active"
              href="/games/rius/active"
              icon={BarChart3Icon}
              stats={{
                activeSets: activeRiu.sets.length,
                participants: riuParticipants,
                upcomingPlayers: upcomingPlayers,
              }}
            />

            <GameCard
              name="Back It Up"
              description="Land the previous trick, then set a new one. Chain your skills in an evolving line of creativity."
              status="active"
              href="/games/bius"
              icon={RotateCcwIcon}
              stats={{
                chainLength: biusSets.length,
                participants: biusParticipants,
              }}
            />

            <GameCard
              name="Stack It Up"
              description="Complete the full stack of tricks, then add your own to the end. Build on what came before."
              status="active"
              href="/games/sius"
              icon={LayersIcon}
              stats={{
                chainLength: siusStacks.length,
                participants: siusParticipants,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
