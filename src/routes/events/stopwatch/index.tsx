/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { PauseIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { CountdownDisplay } from "~/components/events/countdown-display";
import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import { users as usersApi } from "~/lib/users";
import { cn } from "~/lib/utils";

const searchSchema = z.object({
  rider: z.string().optional(),
  time: z.coerce.number().min(1).max(3600).optional().default(60),
});

export const Route = createFileRoute("/events/stopwatch/")({
  component: RouteComponent,
  validateSearch: zodValidator(searchSchema),
});

type RiderData = {
  userId: number | null;
  name: string | null;
};

function parseRiderParam(param: string | undefined): RiderData | null {
  if (!param) return null;
  if (param.startsWith("~")) {
    return { userId: null, name: param.slice(1) };
  }
  const userId = Number.parseInt(param, 10);
  if (Number.isNaN(userId)) return null;
  return { userId, name: null };
}

function encodeRiderParam(rider: RiderData | null): string | undefined {
  if (!rider) return undefined;
  if (rider.userId !== null) return String(rider.userId);
  if (rider.name) return `~${rider.name}`;
  return undefined;
}

type StopwatchState = "idle" | "running" | "paused" | "finished";

function RouteComponent() {
  const { rider: riderParam, time: initialSeconds } = Route.useSearch();
  const navigate = useNavigate();

  const rider = useMemo(() => parseRiderParam(riderParam), [riderParam]);

  // Fetch users to resolve rider data
  const { data: allUsers = [] } = useQuery(usersApi.all.queryOptions());

  // Get user data if rider has a userId
  const user = useMemo(() => {
    if (!rider?.userId) return null;
    return allUsers.find((u) => u.id === rider.userId) ?? null;
  }, [rider, allUsers]);

  const displayName = user?.name ?? rider?.name ?? null;

  const [state, setState] = useState<StopwatchState>("idle");
  const [timeRemaining, setTimeRemaining] = useState(initialSeconds * 1000);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    lastTickRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      setTimeRemaining((prev) => {
        const next = prev - delta;
        if (next <= 0) {
          clearTimer();
          setState("finished");
          return 0;
        }
        return next;
      });
    }, 16);
    setState("running");
  }, [clearTimer]);

  const pauseTimer = useCallback(() => {
    clearTimer();
    setState("paused");
  }, [clearTimer]);

  const resetTimer = useCallback(() => {
    clearTimer();
    setTimeRemaining(initialSeconds * 1000);
    setState("idle");
  }, [clearTimer, initialSeconds]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        switch (state) {
        case "idle":
        case "paused": {
          startTimer();

        break;
        }
        case "running": {
          pauseTimer();

        break;
        }
        case "finished": {
          resetTimer();

        break;
        }
        // No default
        }
      }
      if (e.code === "KeyR") {
        e.preventDefault();
        resetTimer();
      }
    },
    [state, startTimer, pauseTimer, resetTimer],
  );

  const handleClick = useCallback(() => {
    switch (state) {
    case "idle":
    case "paused": {
      startTimer();

    break;
    }
    case "running": {
      pauseTimer();

    break;
    }
    case "finished": {
      resetTimer();

    break;
    }
    // No default
    }
  }, [state, startTimer, pauseTimer, resetTimer]);

  const isFinished = state === "finished";
  const isLow = timeRemaining <= 10_000 && state === "running";

  return (
    <>
      <PageHeader maxWidth="full">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/events">events</PageHeader.Crumb>
          <PageHeader.Crumb>{displayName || "stopwatch"}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Actions>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              navigate({
                to: "/events/stopwatch/setup",
                search: { rider: encodeRiderParam(rider), time: initialSeconds },
              })
            }
          >
            Settings
          </Button>
          <Button variant="secondary" size="icon-xs" onClick={resetTimer}>
            <RotateCcwIcon className="size-3.5" />
          </Button>
        </PageHeader.Actions>
      </PageHeader>
      <div
        role="application"
        aria-label="Stopwatch timer"
        className={cn(
          "flex h-full flex-col transition-colors duration-300",
          isFinished && "bg-destructive/20",
          isLow && !isFinished && "bg-yellow-500/10",
        )}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >

      {/* Timer Display */}
      <div className="flex grow flex-col items-center justify-center">
        <CountdownDisplay
          timeRemaining={timeRemaining}
          maxSeconds={initialSeconds}
          isRunning={state === "running"}
          isFinished={isFinished}
          className="text-[20vw]"
        />
      </div>

      {/* Play/Pause Button */}
      <div className="flex items-center justify-center border-t py-4">
        <Button onClick={handleClick} className="gap-2">
          {state === "finished" ? (
            <>
              <RotateCcwIcon className="size-4" />
              Reset
            </>
          ) : state === "running" ? (
            <>
              <PauseIcon className="size-4" />
              Pause
            </>
          ) : (
            <>
              <PlayIcon className="size-4" />
              {state === "paused" ? "Resume" : "Start"}
            </>
          )}
        </Button>
      </div>
      </div>
    </>
  );
}
