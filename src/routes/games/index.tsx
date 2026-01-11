import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  CalendarIcon,
  LayersIcon,
  PlayIcon,
  BarChart3Icon,
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
      context.queryClient.ensureQueryData(games.rius.active.list.queryOptions()),
      context.queryClient.ensureQueryData(
        games.rius.upcoming.roster.queryOptions(),
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
    <Link to={href} className="block">
      <Card
        className={cn(
          "group relative overflow-hidden transition-all",
          "border-dashed cursor-pointer",
          "hover:scale-[1.01] focus-within:scale-[1.01]",
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

        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>

          {isActive && stats && (
            <div className="flex flex-col gap-2 border-t pt-4">
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
              {stats.participants !== undefined && (
                <div className="flex items-center gap-2">
                  <UsersIcon className="text-muted-foreground size-4" />
                  <p className="text-muted-foreground text-xs">
                    <span className="text-foreground font-medium">
                      {stats.participants}
                    </span>{" "}
                    players
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
            </div>
          )}

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

  const riuParticipants = new Set(activeRiu.sets.map((s) => s.user.id)).size;
  const upcomingPlayers = Object.keys(upcomingRoster.roster).length;

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
              status="coming-soon"
              href="/games/bius"
              icon={RotateCcwIcon}
            />

            <GameCard
              name="Stack It Up"
              description="Complete the full stack of tricks, then add your own to the end. Build on what came before."
              status="coming-soon"
              href="/games/sius"
              icon={LayersIcon}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
