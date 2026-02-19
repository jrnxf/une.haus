import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  ArchiveIcon,
  ArrowDownToLineIcon,
  CalendarIcon,
  RefreshCwIcon,
  ShieldIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useAdminRotateRius } from "~/lib/games/rius/hooks";
import { useIsAdmin } from "~/lib/session/hooks";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/games/rius")({
  component: RouteComponent,
});

const pad = (n: number) => n.toString().padStart(2, "0");

function getNextMondayMidnightUTC(): Date {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  // Days until Monday (0 = Sunday, 1 = Monday, etc.)
  // If today is Monday (1), we want next Monday (7 days)
  // If today is Sunday (0), we want tomorrow (1 day)
  const daysUntilMonday =
    dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek;

  const nextMonday = new Date(now);
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);

  return nextMonday;
}

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState(() => {
    const target = getNextMondayMidnightUTC();
    return Math.max(0, target.getTime() - Date.now());
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const target = getNextMondayMidnightUTC();
      const remaining = Math.max(0, target.getTime() - Date.now());
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const totalSeconds = Math.floor(timeLeft / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    formatted: `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
  };
}

function Countdown() {
  const { formatted } = useCountdown();

  return (
    <div className="text-muted-foreground flex items-center gap-1.5 text-xs tabular-nums">
      <span className="hidden sm:inline">next round in</span>
      <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
        {formatted}
      </code>
    </div>
  );
}

function RouteComponent() {
  const isAdmin = useIsAdmin();
  const rotateRius = useAdminRotateRius();

  return (
    <>
      <PageHeader maxWidth="max-w-4xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <PageHeader.Crumb>rack it up</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <Countdown />
        <PageHeader.Tabs>
          <PageHeader.Tab to="/games/rius/active" icon={ArrowDownToLineIcon}>active</PageHeader.Tab>
          <PageHeader.Tab to="/games/rius/upcoming" icon={CalendarIcon}>upcoming</PageHeader.Tab>
          <PageHeader.Tab to="/games/rius/archived" icon={ArchiveIcon}>archived</PageHeader.Tab>
        </PageHeader.Tabs>
        <PageHeader.Actions>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon-xs"
                  aria-label="Admin menu"
                >
                  <ShieldIcon className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => rotateRius.mutate({})}
                  disabled={rotateRius.isPending}
                >
                  <RefreshCwIcon
                    className={cn(
                      "size-4",
                      rotateRius.isPending && "animate-spin",
                    )}
                  />
                  Rotate
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </PageHeader.Actions>
      </PageHeader>

      <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
        <Outlet />
      </div>
    </>
  );
}
