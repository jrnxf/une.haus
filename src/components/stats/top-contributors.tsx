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
    totalContributions: number;
  }[];
};

export function TopContributors({ data }: TopContributorsProps) {
  if (data.length === 0) {
    return (
      <Card className="border-dashed py-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">top contributors</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <p className="text-muted-foreground text-sm">no contributors yet</p>
        </CardContent>
      </Card>
    );
  }

  const maxContributions = Math.max(...data.map((d) => d.totalContributions));

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
            ranked by total activity: sets, submissions, posts, messages, and
            likes
          </TooltipContent>
        </Tooltip>
      </CardHeader>
      <CardContent className="space-y-3 px-4">
        {data.map((contributor, index) => (
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
                <AvatarFallback name={contributor.name} className="text-[10px]" />
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
                    <div
                      className="h-full rounded-full bg-[var(--chart-2)] transition-all"
                      style={{
                        width: `${(contributor.totalContributions / maxContributions) * 100}%`,
                      }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {contributor.totalContributions} total contributions
                </TooltipContent>
              </Tooltip>
              <span className="text-muted-foreground w-8 shrink-0 text-right text-xs tabular-nums">
                {contributor.totalContributions}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter className="border-t px-4 pt-4">
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
