import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import {
  ArchiveIcon,
  ArrowLeftIcon,
  CalendarIcon,
  PlayCircleIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  ShieldIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

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

type TabConfig = {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const tabs: TabConfig[] = [
  { path: "/games/rius/active", label: "active", icon: PlayCircleIcon },
  { path: "/games/rius/upcoming", label: "upcoming", icon: CalendarIcon },
  { path: "/games/rius/archived", label: "archived", icon: ArchiveIcon },
];

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
  const location = useLocation();
  const isAdmin = useIsAdmin();
  const rotateRius = useAdminRotateRius();

  const isActive = (path: string) => location.pathname.includes(path);

  return (
    <div className="flex grow flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground -ml-2 gap-1.5"
              asChild
            >
              <Link to="/games">
                <ArrowLeftIcon className="size-4" />
                games
              </Link>
            </Button>
            <div className="bg-border h-4 w-px" />
            <div className="flex items-center gap-2">
              <div className="bg-muted text-muted-foreground flex size-6 items-center justify-center rounded-md">
                <RotateCcwIcon className="size-3.5" />
              </div>
              <h1 className="text-sm font-semibold">rack it up</h1>
            </div>
            <div className="bg-border hidden h-4 w-px md:block" />
            <div className="hidden md:block">
              <Countdown />
            </div>
          </div>

          {/* Tabs + Admin */}
          <div className="flex items-center gap-2">
            <nav className="flex gap-1" aria-label="Game sections">
              {tabs.map((tab) => {
                const active = isActive(tab.path);
                const Icon = tab.icon;
                return (
                  <Link
                    key={tab.path}
                    to={tab.path}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                      active
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span className="hidden md:inline">{tab.label}</span>
                  </Link>
                );
              })}
            </nav>

            {isAdmin && (
              <>
                <div className="bg-border h-4 w-px" />
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
              </>
            )}
          </div>
        </div>
        {/* Mobile countdown */}
        <div className="border-t px-4 py-2 md:hidden">
          <Countdown />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" id="main-content">
        <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
