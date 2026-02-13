import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  HeartIcon,
  LayersIcon,
  MessageCircleIcon,
  PlayCircleIcon,
  SendIcon,
} from "lucide-react";

import { PageHeader } from "~/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { stats } from "~/lib/stats";

export const Route = createFileRoute("/stats/contributors")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      stats.contributors.queryOptions(),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: contributors } = useSuspenseQuery(
    stats.contributors.queryOptions(),
  );

  const maxPoints = Math.max(...contributors.map((c) => c.totalPoints));

  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/stats">stats</PageHeader.Crumb>
          <PageHeader.Crumb>contributors</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
        <Card>
            <CardHeader className="border-b pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {contributors.length} contributors
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-muted-foreground flex cursor-help items-center gap-3 text-xs">
                      <LayersIcon className="size-3.5" />
                      <PlayCircleIcon className="size-3.5" />
                      <SendIcon className="size-3.5" />
                      <MessageCircleIcon className="size-3.5" />
                      <HeartIcon className="size-3.5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">
                    <div className="space-y-1">
                      <p>
                        sets/submissions/posts (5pts), messages (2pts), likes
                        (1pt)
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {contributors.map((contributor, index) => {
                const riuSetsPoints = contributor.riuSetsCount * 5;
                const riuSubmissionsPoints =
                  contributor.riuSubmissionsCount * 5;
                const biuSetsPoints = contributor.biuSetsCount * 5;
                const siuStacksPoints = contributor.siuStacksCount * 5;
                const postsPoints = contributor.postsCount * 5;
                const messagesPoints = contributor.messagesCount * 2;
                const likesPoints = contributor.likesCount;

                return (
                  <div
                    key={contributor.id}
                    className="flex items-center gap-4 px-6 py-4"
                  >
                    <span className="text-muted-foreground w-6 shrink-0 text-right text-sm font-medium tabular-nums">
                      {index + 1}
                    </span>
                    <Link
                      to="/users/$userId"
                      params={{ userId: contributor.id }}
                      className="flex shrink-0 items-center gap-2"
                    >
                      <Avatar
                        className="size-7"
                        cloudflareId={contributor.avatarId}
                        alt={contributor.name}
                      >
                        <AvatarImage width={56} quality={80} />
                        <AvatarFallback
                          name={contributor.name}
                          className="text-xs"
                        />
                      </Avatar>
                    </Link>
                    <Link
                      to="/users/$userId"
                      params={{ userId: contributor.id }}
                      className="w-24 shrink-0 truncate text-sm font-medium hover:underline"
                    >
                      {contributor.name}
                    </Link>
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="bg-muted h-3 flex-1 cursor-help overflow-hidden rounded-full">
                            <div className="flex h-full">
                              <div
                                className="h-full bg-rose-500 transition-all"
                                style={{
                                  width: `${(riuSetsPoints / maxPoints) * 100}%`,
                                }}
                              />
                              <div
                                className="h-full bg-orange-500 transition-all"
                                style={{
                                  width: `${(riuSubmissionsPoints / maxPoints) * 100}%`,
                                }}
                              />
                              <div
                                className="h-full bg-amber-500 transition-all"
                                style={{
                                  width: `${(biuSetsPoints / maxPoints) * 100}%`,
                                }}
                              />
                              <div
                                className="h-full bg-lime-500 transition-all"
                                style={{
                                  width: `${(siuStacksPoints / maxPoints) * 100}%`,
                                }}
                              />
                              <div
                                className="h-full bg-[var(--chart-3)] transition-all"
                                style={{
                                  width: `${(postsPoints / maxPoints) * 100}%`,
                                }}
                              />
                              <div
                                className="h-full bg-[var(--chart-4)] transition-all"
                                style={{
                                  width: `${(messagesPoints / maxPoints) * 100}%`,
                                }}
                              />
                              <div
                                className="h-full bg-[var(--chart-2)] transition-all"
                                style={{
                                  width: `${(likesPoints / maxPoints) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div className="flex items-center gap-2">
                              <div className="size-2 rounded-full bg-rose-500" />
                              <span>{contributor.riuSetsCount} riu sets</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="size-2 rounded-full bg-orange-500" />
                              <span>
                                {contributor.riuSubmissionsCount} riu subs
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="size-2 rounded-full bg-amber-500" />
                              <span>{contributor.biuSetsCount} biu sets</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="size-2 rounded-full bg-lime-500" />
                              <span>
                                {contributor.siuStacksCount} siu stacks
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="size-2 rounded-full bg-[var(--chart-3)]" />
                              <span>{contributor.postsCount} posts</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="size-2 rounded-full bg-[var(--chart-4)]" />
                              <span>{contributor.messagesCount} messages</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="size-2 rounded-full bg-[var(--chart-2)]" />
                              <span>{contributor.likesCount} likes</span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                      <span className="text-muted-foreground w-10 shrink-0 text-right text-sm font-bold tabular-nums">
                        {contributor.totalPoints}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="mt-4 flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-1.5 text-xs">
              <div className="size-2 rounded-full bg-rose-500" />
              <span className="text-muted-foreground">riu sets</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="size-2 rounded-full bg-orange-500" />
              <span className="text-muted-foreground">riu submissions</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="size-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">biu sets</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="size-2 rounded-full bg-lime-500" />
              <span className="text-muted-foreground">siu stacks</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="size-2 rounded-full bg-[var(--chart-3)]" />
              <span className="text-muted-foreground">posts</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="size-2 rounded-full bg-[var(--chart-4)]" />
              <span className="text-muted-foreground">messages</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="size-2 rounded-full bg-[var(--chart-2)]" />
              <span className="text-muted-foreground">likes</span>
            </div>
          </div>
      </div>
    </>
  );
}
