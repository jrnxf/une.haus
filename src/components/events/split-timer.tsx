import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRightIcon,
  PlayIcon,
  RotateCcwIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CountdownDisplay } from "~/components/events/countdown-display";
import { Logo } from "~/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { type ResolvedRiderEntry } from "~/lib/events/bracket";
import { users as usersApi } from "~/lib/users";
import { cn } from "~/lib/utils";

type TimerState = "idle" | "running" | "paused" | "finished";

type TimerData = {
  state: TimerState;
  timeRemaining: number;
};

type SplitTimerProps = {
  rider1?: ResolvedRiderEntry;
  rider2?: ResolvedRiderEntry;
  time: number;
  headerContent?: React.ReactNode;
};

export function SplitTimer({
  rider1,
  rider2,
  time: initialSeconds,
  headerContent,
}: SplitTimerProps) {
  const [swapped, setSwapped] = useState(false);
  const [activeTimer, setActiveTimer] = useState<1 | 2 | null>(null);
  const [timer1, setTimer1] = useState<TimerData>({
    state: "idle",
    timeRemaining: initialSeconds * 1000,
  });
  const [timer2, setTimer2] = useState<TimerData>({
    state: "idle",
    timeRemaining: initialSeconds * 1000,
  });

  // Fetch user data to get avatars
  const { data: allUsers = [] } = useQuery(usersApi.all.queryOptions());

  // Create a map for quick user lookup
  const usersMap = useMemo(() => {
    const map = new Map<
      number,
      { id: number; name: string; avatarId: string | null }
    >();
    for (const user of allUsers) {
      map.set(user.id, user);
    }
    return map;
  }, [allUsers]);

  // Get full user data for riders
  const user1 = rider1?.userId ? usersMap.get(rider1.userId) : null;
  const user2 = rider2?.userId ? usersMap.get(rider2.userId) : null;

  // Display data based on swap state
  const leftRider = swapped ? rider2 : rider1;
  const rightRider = swapped ? rider1 : rider2;
  const leftUser = swapped ? user2 : user1;
  const rightUser = swapped ? user1 : user2;
  const leftName = leftUser?.name ?? leftRider?.name ?? null;
  const rightName = rightUser?.name ?? rightRider?.name ?? null;
  const leftTimer = swapped ? timer2 : timer1;
  const rightTimer = swapped ? timer1 : timer2;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const reset = useCallback(() => {
    clearTimer();
    setTimer1({ state: "idle", timeRemaining: initialSeconds * 1000 });
    setTimer2({ state: "idle", timeRemaining: initialSeconds * 1000 });
    setActiveTimer(null);
  }, [clearTimer, initialSeconds]);

  const handlePlayPause = useCallback(() => {
    // Both finished - reset
    if (timer1.state === "finished" && timer2.state === "finished") {
      reset();
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
  }, [
    activeTimer,
    timer1.state,
    timer2.state,
    clearTimer,
    startTimerLoop,
    reset,
  ]);

  // Global keyboard shortcut for reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyR") {
        e.preventDefault();
        reset();
      }
    };
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const bothFinished =
    timer1.state === "finished" && timer2.state === "finished";
  const bothIdle = timer1.state === "idle" && timer2.state === "idle";

  // Determine button label based on state
  const isAnyRunning = timer1.state === "running" || timer2.state === "running";
  const buttonLabel = bothFinished
    ? "Reset"
    : isAnyRunning
      ? "Switch"
      : bothIdle
        ? "Start"
        : "Switch";
  const ButtonIcon = bothFinished
    ? RotateCcwIcon
    : isAnyRunning
      ? ArrowLeftRightIcon
      : PlayIcon;

  return (
    <div ref={containerRef} className="bg-background flex h-full flex-col">
      {/* Header */}
      {headerContent && (
        <div className="flex items-center justify-between border-b px-4 py-4">
          {headerContent}
        </div>
      )}

      {/* Split Timers */}
      <div className="relative flex grow">
        {/* Vertical divider */}
        <div className="bg-border absolute top-0 bottom-0 left-1/2 w-px" />

        {/* Swap button - centered at top */}
        {(leftRider || rightRider) && (
          <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2">
            <Button
              variant="secondary"
              size="icon-xs"
              onClick={() => setSwapped((s) => !s)}
              aria-label="Swap sides"
            >
              <ArrowLeftRightIcon className="size-3.5" />
            </Button>
          </div>
        )}

        {/* Left Timer */}
        <div
          className={cn(
            "relative flex flex-1 flex-col items-center justify-center transition-colors duration-200",
            leftTimer.state === "finished" && "bg-destructive/20",
            leftTimer.timeRemaining <= 10_000 &&
              leftTimer.state === "running" &&
              "bg-yellow-500/10",
            leftTimer.state === "running" && "bg-primary/5",
          )}
        >
          {leftName && (
            <div className="absolute top-4 left-4 flex items-center gap-2">
              {leftUser?.avatarId && (
                <Avatar
                  className="size-8"
                  cloudflareId={leftUser.avatarId}
                  alt={leftName}
                >
                  <AvatarImage width={64} quality={90} />
                  <AvatarFallback className="text-xs" name={leftName} />
                </Avatar>
              )}
              <span className="text-lg font-semibold">{leftName}</span>
            </div>
          )}
          <CountdownDisplay
            timeRemaining={leftTimer.timeRemaining}
            maxSeconds={initialSeconds}
            isRunning={leftTimer.state === "running"}
            isFinished={leftTimer.state === "finished"}
            className="text-[12vw]"
          />
          <div className="text-muted-foreground mt-4 text-sm">
            {leftTimer.state === "idle" && "Waiting"}
            {leftTimer.state === "running" && "Running"}
            {leftTimer.state === "paused" && "Paused"}
            {leftTimer.state === "finished" && "Finished"}
          </div>
        </div>

        {/* Right Timer */}
        <div
          className={cn(
            "relative flex flex-1 flex-col items-center justify-center transition-colors duration-200",
            rightTimer.state === "finished" && "bg-destructive/20",
            rightTimer.timeRemaining <= 10_000 &&
              rightTimer.state === "running" &&
              "bg-yellow-500/10",
            rightTimer.state === "running" && "bg-primary/5",
          )}
        >
          {rightName && (
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className="text-lg font-semibold">{rightName}</span>
              {rightUser?.avatarId && (
                <Avatar
                  className="size-8"
                  cloudflareId={rightUser.avatarId}
                  alt={rightName}
                >
                  <AvatarImage width={64} quality={90} />
                  <AvatarFallback className="text-xs" name={rightName} />
                </Avatar>
              )}
            </div>
          )}
          <CountdownDisplay
            timeRemaining={rightTimer.timeRemaining}
            maxSeconds={initialSeconds}
            isRunning={rightTimer.state === "running"}
            isFinished={rightTimer.state === "finished"}
            className="text-[12vw]"
          />
          <div className="text-muted-foreground mt-4 text-sm">
            {rightTimer.state === "idle" && "Waiting"}
            {rightTimer.state === "running" && "Running"}
            {rightTimer.state === "paused" && "Paused"}
            {rightTimer.state === "finished" && "Finished"}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center justify-center gap-1 border-t py-4">
        <div className="flex items-center gap-2">
          <Button onClick={handlePlayPause} className="gap-2">
            <ButtonIcon className="size-4" />
            {buttonLabel}
          </Button>
          <Button variant="secondary" size="icon" onClick={reset} aria-label="Reset timers">
            <RotateCcwIcon className="size-4" />
          </Button>
        </div>
        <p className="text-muted-foreground hidden text-xs sm:block">
          press <kbd className="bg-muted rounded px-1 font-mono text-[10px]">R</kbd> to reset
        </p>
        <p className="text-muted-foreground block text-xs sm:hidden">
          rotate device for best experience
        </p>
      </div>

      <Logo className="pointer-events-none absolute right-4 bottom-4 h-6 w-auto opacity-50" />
    </div>
  );
}
