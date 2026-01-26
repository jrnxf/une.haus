import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GlobeIcon, PlayIcon, TrendingUpIcon, UsersIcon } from "lucide-react";

import { LogoRandomScatter } from "~/components/logo-animated";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { games, groupSetsByUserWithRankings } from "~/lib/games";
import { stats } from "~/lib/stats";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    // Get list of archived RIUs (only those with sets)
    const archivedList = await context.queryClient.ensureQueryData(
      games.rius.archived.list.queryOptions(),
    );

    // Find the most recent one (sorted by createdAt desc)
    const mostRecent = archivedList.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];

    await Promise.all([
      context.queryClient.ensureQueryData(stats.get.queryOptions()),
      context.queryClient.ensureQueryData(
        games.rius.active.list.queryOptions(),
      ),
      // Only fetch archived details if there's one with sets
      mostRecent
        ? context.queryClient.ensureQueryData(
            games.rius.archived.get.queryOptions({ riuId: mostRecent.id }),
          )
        : Promise.resolve(null),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: statsData } = useSuspenseQuery(stats.get.queryOptions());
  const { data: activeRiu } = useSuspenseQuery(
    games.rius.active.list.queryOptions(),
  );
  const { data: archivedList } = useSuspenseQuery(
    games.rius.archived.list.queryOptions(),
  );

  // Get most recent archived RIU that has sets
  const mostRecentArchived = archivedList.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];

  // Use regular useQuery with enabled flag for conditional fetch
  const { data: archivedRiu } = useQuery({
    ...games.rius.archived.get.queryOptions({
      riuId: mostRecentArchived?.id ?? 0,
    }),
    enabled: !!mostRecentArchived,
  });

  const podium =
    archivedRiu && archivedRiu.sets.length > 0
      ? groupSetsByUserWithRankings(archivedRiu.sets).slice(0, 3)
      : [];

  const totalSubmissions =
    activeRiu?.sets.reduce((acc, set) => acc + set.submissions.length, 0) ?? 0;

  // Reorder podium for visual display: 2nd, 1st, 3rd
  const displayPodium =
    podium.length >= 3
      ? [podium[1], podium[0], podium[2]]
      : podium.length === 2
        ? [podium[1], podium[0]]
        : podium;

  return (
    <div className="flex grow flex-col overflow-hidden">
      <div className="overflow-y-auto" id="main-content">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
          {/* Logo + Tagline */}
          <div className="flex flex-col items-center gap-2 py-4">
            <LogoRandomScatter className="h-16" />
            <p className="text-muted-foreground text-center text-sm">
              a rider-centric unicycle community
            </p>
          </div>

          {/* Hero Podium Section */}
          {podium.length > 0 && archivedRiu && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500/10 via-transparent to-amber-500/10 p-6">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-500/5 via-transparent to-transparent" />
              <div className="relative">
                <p className="text-muted-foreground mb-6 text-center text-sm font-medium tracking-wider uppercase">
                  Last Week's Champions
                </p>

                {/* Podium Visual */}
                <div className="mb-4 flex items-end justify-center gap-2">
                  {displayPodium.map((rider, idx) => {
                    const isFirst =
                      rider.ranking.rank === 1 ||
                      (podium.length === 1 && idx === 0);
                    const isSecond = rider.ranking.rank === 2;
                    const isThird = rider.ranking.rank === 3;

                    return (
                      <Link
                        key={rider.user.id}
                        to="/users/$userId"
                        params={{ userId: rider.user.id }}
                        className={cn(
                          "group flex flex-col items-center transition-transform hover:scale-105",
                          isFirst && "order-2",
                          isSecond && "order-1",
                          isThird && "order-3",
                        )}
                      >
                        {/* Avatar with glow */}
                        <div
                          className={cn(
                            "relative mb-2",
                            isFirst && "mb-3 scale-125",
                          )}
                        >
                          <div
                            className={cn(
                              "absolute -inset-1 rounded-full opacity-50 blur-md",
                              isFirst && "bg-yellow-500",
                              isSecond && "bg-gray-400",
                              isThird && "bg-amber-700",
                            )}
                          />
                          <Avatar
                            className={cn(
                              "relative rounded-full ring-2",
                              isFirst && "size-20 ring-4 ring-yellow-500/50",
                              isSecond && "size-14 ring-gray-400/50",
                              isThird && "size-14 ring-amber-700/50",
                            )}
                            cloudflareId={rider.user.avatarId}
                            alt={rider.user.name}
                          >
                            <AvatarImage width={160} quality={85} />
                            <AvatarFallback
                              className={cn(isFirst ? "text-lg" : "text-sm")}
                              name={rider.user.name}
                            />
                          </Avatar>
                        </div>

                        {/* Name */}
                        <p
                          className={cn(
                            "max-w-20 truncate text-center font-medium group-hover:underline",
                            isFirst && "max-w-28 text-base",
                            !isFirst && "text-muted-foreground text-sm",
                          )}
                        >
                          {rider.user.name.split(" ")[0]}
                        </p>

                        {/* Podium block */}
                        <div
                          className={cn(
                            "mt-2 flex w-20 items-center justify-center rounded-t-lg font-bold",
                            isFirst &&
                              "h-16 w-24 bg-gradient-to-t from-yellow-600 to-yellow-500 text-2xl text-yellow-100",
                            isSecond &&
                              "h-12 bg-gradient-to-t from-gray-600 to-gray-500 text-xl text-gray-100",
                            isThird &&
                              "h-10 bg-gradient-to-t from-amber-800 to-amber-700 text-lg text-amber-100",
                          )}
                        >
                          {rider.ranking.rank}
                        </div>
                      </Link>
                    );
                  })}
                </div>

                <div className="flex justify-center">
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      to="/games/rius/archived/$riuId"
                      params={{ riuId: String(archivedRiu.id) }}
                    >
                      View full results
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Bento Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Play RIU - Full width featured card */}
            <Link
              to="/games/rius"
              className="group col-span-2 flex items-center justify-between rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-6 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/20"
            >
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <TrendingUpIcon className="size-5 text-violet-200" />
                  <p className="text-sm font-medium tracking-wider text-violet-200 uppercase">
                    This Week's RIU
                  </p>
                </div>
                <div className="flex items-baseline gap-4">
                  <div>
                    <span className="text-4xl font-bold text-white">
                      {activeRiu?.sets.length ?? 0}
                    </span>
                    <span className="ml-1 text-violet-200">sets</span>
                  </div>
                  <div>
                    <span className="text-4xl font-bold text-white">
                      {totalSubmissions}
                    </span>
                    <span className="ml-1 text-violet-200">clips</span>
                  </div>
                </div>
              </div>
              <div className="flex size-14 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:scale-110">
                <PlayIcon className="size-7 fill-white text-white" />
              </div>
            </Link>

            {/* Riders stat */}
            <Link
              to="/users"
              className="group flex flex-col justify-between rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 p-6 transition-all hover:scale-[1.02]"
            >
              <UsersIcon className="size-6 text-emerald-500" />
              <div className="mt-4">
                <p className="text-4xl font-bold">{statsData.counts.users}</p>
                <p className="text-muted-foreground text-sm">
                  riders worldwide
                </p>
              </div>
            </Link>

            {/* Countries stat */}
            <Link
              to="/users"
              className="group flex flex-col justify-between rounded-2xl bg-gradient-to-br from-sky-500/20 to-sky-600/10 p-6 transition-all hover:scale-[1.02]"
            >
              <GlobeIcon className="size-6 text-sky-500" />
              <div className="mt-4">
                <p className="text-4xl font-bold">
                  {statsData.counts.countries}
                </p>
                <p className="text-muted-foreground text-sm">countries</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
