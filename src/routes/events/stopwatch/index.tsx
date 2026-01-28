/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { ArrowLeftIcon, PauseIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const searchSchema = z.object({
  name: z.string().optional(),
  time: z.coerce.number().min(1).max(3600).optional().default(60),
});

export const Route = createFileRoute("/events/stopwatch/")({
  component: RouteComponent,
  validateSearch: zodValidator(searchSchema),
});

const pad = (n: number) => n.toString().padStart(2, "0");

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${pad(minutes)}:${pad(seconds)}`;
}

type StopwatchState = "idle" | "running" | "paused" | "finished";

function RouteComponent() {
  const { name, time: initialSeconds } = Route.useSearch();
  const navigate = useNavigate();

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

  const isLow = timeRemaining <= 10_000 && state === "running";
  const isFinished = state === "finished";

  return (
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
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/events">
              <ArrowLeftIcon className="size-4" />
              Back
            </Link>
          </Button>
          {name && (
            <>
              <div className="bg-border h-4 w-px" />
              <span className="text-lg font-semibold">{name}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              navigate({
                to: "/events/stopwatch/setup",
                search: { name, time: initialSeconds },
              })
            }
          >
            Settings
          </Button>
          <Button variant="secondary" size="icon-xs" onClick={resetTimer}>
            <RotateCcwIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Timer Display */}
      <button
        type="button"
        className="flex grow cursor-pointer flex-col items-center justify-center"
        onClick={handleClick}
      >
        <div
          className={cn(
            "font-mono text-[20vw] font-bold leading-none tabular-nums transition-colors",
            isFinished && "text-destructive",
            isLow && !isFinished && "text-yellow-500",
          )}
        >
          {formatTime(timeRemaining)}
        </div>

        <div className="text-muted-foreground mt-6 flex items-center gap-2 text-lg">
          {state === "idle" && (
            <>
              <PlayIcon className="size-5" />
              <span>Press space to start</span>
            </>
          )}
          {state === "running" && (
            <>
              <PauseIcon className="size-5" />
              <span>Press space to pause</span>
            </>
          )}
          {state === "paused" && (
            <>
              <PlayIcon className="size-5" />
              <span>Press space to resume</span>
            </>
          )}
          {state === "finished" && (
            <>
              <RotateCcwIcon className="size-5" />
              <span>Press space to reset</span>
            </>
          )}
        </div>
      </button>
    </div>
  );
}
