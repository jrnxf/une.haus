import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

const STAT_COLS = [
  {
    key: "riuSetsCount",
    label: "riu sets",
    pts: 5,
    dot: "bg-rose-500",
    text: "text-rose-500",
  },
  {
    key: "riuSubmissionsCount",
    label: "riu subs",
    pts: 5,
    dot: "bg-orange-500",
    text: "text-orange-500",
  },
  {
    key: "biuSetsCount",
    label: "biu sets",
    pts: 5,
    dot: "bg-amber-500",
    text: "text-amber-500",
  },
  {
    key: "siuStacksCount",
    label: "siu stacks",
    pts: 5,
    dot: "bg-lime-500",
    text: "text-lime-500",
  },
  {
    key: "postsCount",
    label: "posts",
    pts: 5,
    dot: "bg-chart-3",
    text: "text-chart-3",
  },
  {
    key: "messagesCount",
    label: "messages",
    pts: 2,
    dot: "bg-chart-4",
    text: "text-chart-4",
  },
  {
    key: "likesCount",
    label: "likes",
    pts: 1,
    dot: "bg-chart-2",
    text: "text-chart-2",
  },
] as const;

type Contributor = {
  id: number;
  name: string;
  avatarId: string | null;
  riuSetsCount: number;
  riuSubmissionsCount: number;
  biuSetsCount: number;
  siuStacksCount: number;
  postsCount: number;
  messagesCount: number;
  likesCount: number;
  totalPoints: number;
};

type TopContributorsProps = {
  data: Contributor[];
};

export function TopContributors({ data }: TopContributorsProps) {
  if (data.length === 0) {
    return (
      <Card className="py-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">top users</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">no users yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gap-0 divide-y overflow-hidden py-0">
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <CardTitle className="cursor-help text-sm font-medium">
              top users
            </CardTitle>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] text-xs">
            ranked by points: sets/submissions/posts (5pts), messages (2pts),
            likes (1pt)
          </TooltipContent>
        </Tooltip>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/metrics/users" className="group">
            View all
            <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="overflow-auto p-0 text-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-7 w-[40px] max-w-[40px] min-w-[40px]">
                #
              </TableHead>
              <TableHead className="h-7 w-[140px] max-w-[140px] min-w-[140px]">
                user
              </TableHead>
              {STAT_COLS.map((col) => (
                <TableHead key={col.key} className="h-7 text-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex w-full justify-center">
                        <div className={cn("size-2 rounded-full", col.dot)} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      {col.label} ({col.pts}pts)
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
              ))}
              <TableHead className="h-7 text-right">pts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((contributor, index) => (
              <TableRow key={contributor.id} className="cursor-pointer">
                <TableCell className="relative py-1.5">
                  <span className="text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                </TableCell>
                <TableCell className="relative py-1.5">
                  <Link
                    to="/users/$userId"
                    params={{ userId: contributor.id }}
                    className="flex items-center gap-2 after:absolute after:inset-0 after:content-['']"
                  >
                    <Avatar
                      className="size-5"
                      cloudflareId={contributor.avatarId}
                      alt={contributor.name}
                    >
                      <AvatarImage width={40} quality={80} />
                      <AvatarFallback
                        name={contributor.name}
                        className="text-[9px]"
                      />
                    </Avatar>
                    <span className="truncate font-medium">
                      {contributor.name}
                    </span>
                  </Link>
                </TableCell>
                {STAT_COLS.map((col) => {
                  const val = contributor[col.key];
                  return (
                    <TableCell
                      key={col.key}
                      className="relative py-1.5 text-center"
                    >
                      <span
                        className={cn(
                          "tabular-nums",
                          val > 0
                            ? cn("font-medium", col.text)
                            : "text-muted-foreground/30",
                        )}
                      >
                        {val}
                      </span>
                    </TableCell>
                  );
                })}
                <TableCell className="relative py-1.5 text-right">
                  <span className="tabular-nums">
                    {contributor.totalPoints}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
