import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

type TopContributorsProps = {
  data: {
    id: number;
    name: string;
    avatarId: string | null;
    setsCount: number;
    submissionsCount: number;
    postsCount: number;
    messagesCount: number;
    likesCount: number;
    totalPoints: number;
  }[];
};

export function TopContributors({ data }: TopContributorsProps) {
  if (data.length === 0) {
    return (
      <Card className="border-dashed py-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            top contributors
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <p className="text-muted-foreground text-sm">no contributors yet</p>
        </CardContent>
      </Card>
    );
  }

  const maxPoints = Math.max(...data.map((d) => d.totalPoints));

  return (
    <Card className="border-dashed py-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <CardTitle className="cursor-help text-sm font-medium">
              top contributors
            </CardTitle>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] text-xs">
            ranked by points: sets/submissions/posts (5pts), messages (2pts),
            likes (1pt)
          </TooltipContent>
        </Tooltip>
      </CardHeader>
      <CardContent className="space-y-3 px-4">
        {data.map((contributor, index) => {
          const setsPoints = contributor.setsCount * 5;
          const submissionsPoints = contributor.submissionsCount * 5;
          const postsPoints = contributor.postsCount * 5;
          const messagesPoints = contributor.messagesCount * 2;
          const likesPoints = contributor.likesCount;

          return (
            <div key={contributor.id} className="flex items-center gap-2">
              <span className="text-muted-foreground w-4 shrink-0 text-xs font-medium">
                {index + 1}
              </span>
              <Link
                to="/users/$userId"
                params={{ userId: contributor.id }}
                className="shrink-0"
              >
                <Avatar
                  className="size-6"
                  cloudflareId={contributor.avatarId}
                  alt={contributor.name}
                >
                  <AvatarImage width={48} quality={80} />
                  <AvatarFallback
                    name={contributor.name}
                    className="text-[10px]"
                  />
                </Avatar>
              </Link>
              <Link
                to="/users/$userId"
                params={{ userId: contributor.id }}
                className="w-20 shrink-0 truncate text-sm font-medium hover:underline"
              >
                {contributor.name}
              </Link>
              <div className="flex flex-1 items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-muted h-2 flex-1 cursor-help overflow-hidden rounded-full">
                      <div className="flex h-full">
                        <div
                          className="h-full bg-[var(--chart-1)] transition-all"
                          style={{
                            width: `${((setsPoints + submissionsPoints) / maxPoints) * 100}%`,
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
                        <div className="size-2 rounded-full bg-[var(--chart-1)]" />
                        <span>
                          {contributor.setsCount + contributor.submissionsCount}{" "}
                          game
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
                <span className="text-muted-foreground w-8 shrink-0 text-right text-xs tabular-nums">
                  {contributor.totalPoints}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
      <CardFooter className="border-t px-2 pt-2">
        <Link
          to="/stats/contributors"
          className="text-muted-foreground hover:text-foreground group flex w-full items-center justify-center gap-1.5 text-sm transition-colors"
        >
          view all contributors
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </CardFooter>
    </Card>
  );
}
