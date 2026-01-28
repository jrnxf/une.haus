/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { ArrowLeftIcon, PauseIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const searchSchema = z.object({
  name1: z.string().optional(),
  name2: z.string().optional(),
  time: z.coerce.number().min(1).max(3600).optional().default(60),
});

export const Route = createFileRoute("/events/stopwatch/split")({
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

type TimerState = "idle" | "running" | "paused" | "finished";

type TimerData = {
  state: TimerState;
  timeRemaining: number;
};

function RouteComponent() {
  const { name1, name2, time: initialSeconds } = Route.useSearch();
  const navigate = useNavigate();

  const [activeTimer, setActiveTimer] = useState<1 | 2 | null>(null);
  const [timer1, setTimer1] = useState<TimerData>({
    state: "idle",
    timeRemaining: initialSeconds * 1000,
  });
  const [timer2, setTimer2] = useState<TimerData>({
    state: "idle",
    timeRemaining: initialSeconds * 1000,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimerLoop = useCallback(
    (which: 1 | 2) => {
      clearTimer();
      lastTickRef.current = Date.now();

      const setTimer = which === 1 ? setTimer1 : setTimer2;

      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const delta = now - lastTickRef.current;
        lastTickRef.current = now;

        setTimer((prev) => {
          const next = prev.timeRemaining - delta;
          if (next <= 0) {
            clearTimer();
            return { state: "finished", timeRemaining: 0 };
          }
          return { state: "running", timeRemaining: next };
        });
      }, 16);

      setTimer((prev) => ({ ...prev, state: "running" }));
      setActiveTimer(which);
    },
    [clearTimer],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();

        // Both finished - reset
        if (timer1.state === "finished" && timer2.state === "finished") {
          clearTimer();
          setTimer1({ state: "idle", timeRemaining: initialSeconds * 1000 });
          setTimer2({ state: "idle", timeRemaining: initialSeconds * 1000 });
          setActiveTimer(null);
          return;
        }

        // No timer active yet - start timer 1
        if (activeTimer === null) {
          startTimerLoop(1);
          return;
        }

        // Timer 1 is running - pause it, start timer 2
        if (activeTimer === 1 && timer1.state === "running") {
          clearTimer();
          setTimer1((prev) => ({ ...prev, state: "paused" }));
          if (timer2.state !== "finished") {
            startTimerLoop(2);
          }
          return;
        }

        // Timer 2 is running - pause it, resume timer 1
        if (activeTimer === 2 && timer2.state === "running") {
          clearTimer();
          setTimer2((prev) => ({ ...prev, state: "paused" }));
          if (timer1.state !== "finished") {
            startTimerLoop(1);
          }
          return;
        }

        // Timer 1 is paused and timer 2 finished - resume timer 1
        if (timer1.state === "paused" && timer2.state === "finished") {
          startTimerLoop(1);
          return;
        }

        // Timer 2 is paused and timer 1 finished - resume timer 2
        if (timer2.state === "paused" && timer1.state === "finished") {
          startTimerLoop(2);
          return;
        }
      }

      if (e.code === "KeyR") {
        e.preventDefault();
        clearTimer();
        setTimer1({ state: "idle", timeRemaining: initialSeconds * 1000 });
        setTimer2({ state: "idle", timeRemaining: initialSeconds * 1000 });
        setActiveTimer(null);
      }
    },
    [activeTimer, timer1.state, timer2.state, clearTimer, startTimerLoop, initialSeconds],
  );

  const reset = useCallback(() => {
    clearTimer();
    setTimer1({ state: "idle", timeRemaining: initialSeconds * 1000 });
    setTimer2({ state: "idle", timeRemaining: initialSeconds * 1000 });
    setActiveTimer(null);
  }, [clearTimer, initialSeconds]);

  const bothFinished = timer1.state === "finished" && timer2.state === "finished";
  const bothIdle = timer1.state === "idle" && timer2.state === "idle";

  return (
    <div
      role="application"
      aria-label="Split stopwatch timers"
      className="flex h-full flex-col"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/events">
              <ArrowLeftIcon className="size-4" />
              Back
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              navigate({
                to: "/events/stopwatch/split/setup",
                search: { name1, name2, time: initialSeconds },
              })
            }
          >
            Settings
          </Button>
          <Button variant="secondary" size="icon-xs" onClick={reset}>
            <RotateCcwIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Split Timers */}
      <div className="flex grow">
        {/* Timer 1 */}
        <div
          className={cn(
            "flex flex-1 flex-col items-center justify-center border-r transition-colors duration-300",
            timer1.state === "finished" && "bg-destructive/20",
            timer1.timeRemaining <= 10_000 &&
              timer1.state === "running" &&
              "bg-yellow-500/10",
            timer1.state === "running" && "bg-primary/5",
          )}
        >
          {name1 && (
            <span className="absolute left-4 top-16 text-lg font-semibold">
              {name1}
            </span>
          )}
          <div
            className={cn(
              "font-mono text-[12vw] font-bold leading-none tabular-nums transition-colors",
              timer1.state === "finished" && "text-destructive",
              timer1.timeRemaining <= 10_000 &&
                timer1.state === "running" &&
                "text-yellow-500",
            )}
          >
            {formatTime(timer1.timeRemaining)}
          </div>
          <div className="text-muted-foreground mt-4 text-sm">
            {timer1.state === "idle" && "Waiting"}
            {timer1.state === "running" && "Running"}
            {timer1.state === "paused" && "Paused"}
            {timer1.state === "finished" && "Finished"}
          </div>
        </div>

        {/* Timer 2 */}
        <div
          className={cn(
            "flex flex-1 flex-col items-center justify-center transition-colors duration-300",
            timer2.state === "finished" && "bg-destructive/20",
            timer2.timeRemaining <= 10_000 &&
              timer2.state === "running" &&
              "bg-yellow-500/10",
            timer2.state === "running" && "bg-primary/5",
          )}
        >
          {name2 && (
            <span className="absolute right-4 top-16 text-lg font-semibold">
              {name2}
            </span>
          )}
          <div
            className={cn(
              "font-mono text-[12vw] font-bold leading-none tabular-nums transition-colors",
              timer2.state === "finished" && "text-destructive",
              timer2.timeRemaining <= 10_000 &&
                timer2.state === "running" &&
                "text-yellow-500",
            )}
          >
            {formatTime(timer2.timeRemaining)}
          </div>
          <div className="text-muted-foreground mt-4 text-sm">
            {timer2.state === "idle" && "Waiting"}
            {timer2.state === "running" && "Running"}
            {timer2.state === "paused" && "Paused"}
            {timer2.state === "finished" && "Finished"}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-muted-foreground flex items-center justify-center gap-2 border-t py-4 text-sm">
        {bothIdle && (
          <>
            <PlayIcon className="size-4" />
            <span>Press space to start timer 1</span>
          </>
        )}
        {!bothIdle && !bothFinished && (
          <>
            <PauseIcon className="size-4" />
            <span>Press space to switch timers</span>
          </>
        )}
        {bothFinished && (
          <>
            <RotateCcwIcon className="size-4" />
            <span>Press space to reset</span>
          </>
        )}
      </div>
    </div>
  );
}
