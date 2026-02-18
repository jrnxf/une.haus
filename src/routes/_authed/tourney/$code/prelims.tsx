import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  EllipsisVerticalIcon,
  InfoIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
} from "lucide-react";
import { useCallback, useMemo } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { PageHeader } from "~/components/page-header";
import { CountdownDisplay } from "~/components/tourney/countdown-display";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { tourney } from "~/lib/tourney";
import {
  useAdminHeartbeat,
  useAdvancePhase,
  usePrelimAction,
  useSyncedTimer,
} from "~/lib/tourney/hooks";
import type {
  PrelimStatus,
  TournamentRider,
  TournamentState,
} from "~/lib/tourney/types";
import { users as usersApi } from "~/lib/users";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/_authed/tourney/$code/prelims")({
  staticData: {
    pageHeader: {
      breadcrumbs: [{ label: "tourney", to: "/tourney" }, { label: "prelims" }],
      maxWidth: "lg",
    },
  },
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const tournament = await context.queryClient.ensureQueryData(
      tourney.get.queryOptions({ code: params.code }),
    );
    if (tournament.createdByUserId !== context.user.id) {
      throw redirect({ to: "/tourney" });
    }
  },
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        tourney.get.queryOptions({ code: params.code }),
      ),
      context.queryClient.ensureQueryData(usersApi.all.queryOptions()),
    ]);
  },
});

function RouteComponent() {
  const { code } = Route.useParams();
  useAdminHeartbeat(code);
  const { data: tournament } = useSuspenseQuery(
    tourney.get.queryOptions({ code }),
  );
  const { data: allUsers } = useSuspenseQuery(usersApi.all.queryOptions());

  const prelimAction = usePrelimAction(code);
  const advancePhase = useAdvancePhase(code);

  const { state } = tournament;

  const usersMap = useMemo(() => {
    const map = new Map<
      number,
      { id: number; name: string; avatarId: string | null }
    >();
    for (const user of allUsers) map.set(user.id, user);
    return map;
  }, [allUsers]);

  const resolveRider = useCallback(
    (rider: TournamentRider) => {
      if (rider.userId !== null) {
        const user = usersMap.get(rider.userId);
        return {
          userId: rider.userId,
          name: user?.name ?? rider.name,
          avatarId: user?.avatarId ?? null,
        };
      }
      return { userId: null, name: rider.name, avatarId: null };
    },
    [usersMap],
  );

  const getRiderStatus = useCallback(
    (index: number): PrelimStatus | "current" => {
      if (state.currentRiderIndex === index) return "current";
      return state.prelimStatuses[index] ?? "pending";
    },
    [state.currentRiderIndex, state.prelimStatuses],
  );

  const allFinished = useMemo(
    () =>
      state.riders.every((_, i) => {
        const status = state.prelimStatuses[i];
        return status === "done" || status === "dq";
      }),
    [state.riders, state.prelimStatuses],
  );

  const hasCurrent =
    state.currentRiderIndex !== null &&
    state.currentRiderIndex >= 0 &&
    state.currentRiderIndex < state.riders.length;

  if (hasCurrent) {
    return (
      <TimerView
        code={code}
        rider={state.riders[state.currentRiderIndex!]}
        riderIndex={state.currentRiderIndex!}
        resolveRider={resolveRider}
        nextRiderIndex={findNextPending(state)}
        state={state}
        prelimAction={prelimAction}
        eventName={tournament.name}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 p-4">
      <div className="divide-y rounded-lg border">
        {state.riders.map((rider, index) => {
          const status = getRiderStatus(index);
          const resolved = resolveRider(rider);
          const name = resolved.name ?? "Unknown";

          return (
            <div key={index} className="flex items-center gap-3 px-3 py-2">
              <div
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  status === "done" && "bg-green-500",
                  status === "dq" && "bg-destructive",
                  status === "pending" && "bg-muted-foreground/30",
                )}
              />

              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-sm font-medium",
                  status === "dq" && "line-through opacity-50",
                )}
              >
                {name}
              </span>

              {status === "pending" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    prelimAction.mutate({
                      data: {
                        code,
                        action: { type: "setCurrent", riderIndex: index },
                      },
                    })
                  }
                >
                  Start
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-xs">
                    <EllipsisVerticalIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {status === "pending" && (
                    <DropdownMenuItem
                      onClick={() =>
                        prelimAction.mutate({
                          data: {
                            code,
                            action: {
                              type: "disqualifyRider",
                              riderIndex: index,
                            },
                          },
                        })
                      }
                    >
                      Disqualify
                    </DropdownMenuItem>
                  )}
                  {status === "done" && (
                    <>
                      <DropdownMenuItem
                        onClick={() =>
                          prelimAction.mutate({
                            data: {
                              code,
                              action: { type: "setCurrent", riderIndex: index },
                            },
                          })
                        }
                      >
                        Restart
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          prelimAction.mutate({
                            data: {
                              code,
                              action: {
                                type: "disqualifyRider",
                                riderIndex: index,
                              },
                            },
                          })
                        }
                      >
                        Disqualify
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          prelimAction.mutate({
                            data: {
                              code,
                              action: { type: "resetRider", riderIndex: index },
                            },
                          })
                        }
                      >
                        Reset
                      </DropdownMenuItem>
                    </>
                  )}
                  {status === "dq" && (
                    <DropdownMenuItem
                      onClick={() =>
                        prelimAction.mutate({
                          data: {
                            code,
                            action: { type: "resetRider", riderIndex: index },
                          },
                        })
                      }
                    >
                      Reset
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>

      {allFinished && (
        <Button
          onClick={() =>
            advancePhase.mutate({
              data: { code, phase: "ranking" },
            })
          }
          className="w-full"
          disabled={advancePhase.isPending}
        >
          Ranking
        </Button>
      )}
    </div>
  );
}

function TimerView({
  code,
  rider,
  riderIndex: _riderIndex,
  resolveRider,
  nextRiderIndex,
  state,
  prelimAction,
  eventName,
}: {
  code: string;
  rider: TournamentRider;
  riderIndex: number;
  resolveRider: (rider: TournamentRider) => {
    userId: number | null;
    name: string | null;
    avatarId: string | null;
  };
  nextRiderIndex: number | null;
  state: TournamentState;
  prelimAction: ReturnType<typeof usePrelimAction>;
  eventName: string;
}) {
  const resolved = resolveRider(rider);
  const name = resolved.name ?? "Unknown";

  const nextResolved =
    nextRiderIndex === null ? null : resolveRider(state.riders[nextRiderIndex]);

  const timeRemaining = useSyncedTimer(state.timer);
  const isTimerActive = state.timer?.active ?? false;
  const isPaused =
    state.timer !== null &&
    !state.timer.active &&
    state.timer.pausedRemaining !== null;
  const isFinished =
    timeRemaining !== null && timeRemaining <= 0 && !isTimerActive;
  const isLow = (timeRemaining ?? 0) <= 10_000 && isTimerActive;

  const toggleTimer = useCallback(() => {
    if (isTimerActive) {
      prelimAction.mutate({ data: { code, action: { type: "pauseTimer" } } });
    } else {
      prelimAction.mutate({ data: { code, action: { type: "startTimer" } } });
    }
  }, [isTimerActive, prelimAction, code]);

  const resetTimer = useCallback(() => {
    prelimAction.mutate({ data: { code, action: { type: "resetTimer" } } });
  }, [prelimAction, code]);

  const markDone = useCallback(() => {
    prelimAction.mutate({ data: { code, action: { type: "markDone" } } });
  }, [prelimAction, code]);

  const markDQ = useCallback(() => {
    prelimAction.mutate({ data: { code, action: { type: "markDQ" } } });
  }, [prelimAction, code]);

  useHotkeys("space", toggleTimer);
  useHotkeys("r", resetTimer);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "tourney", to: "/tourney" },
          { label: eventName || "prelims" },
        ]}
        maxWidth="full"
      >
        <PageHeader.Actions>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              prelimAction.mutate({
                data: {
                  code,
                  action: { type: "setCurrent", riderIndex: -1 },
                },
              })
            }
          >
            Queue
          </Button>
        </PageHeader.Actions>
      </PageHeader>

      <div
        className={cn(
          "flex h-full flex-col transition-colors duration-200",
          isTimerActive && !isLow && "bg-primary/5",
          isLow && !isFinished && "bg-yellow-500/10",
          isFinished && "bg-destructive/20",
        )}
      >
        <div className="flex items-center gap-3 px-4 pt-4">
          <Avatar
            className="size-10"
            cloudflareId={resolved.avatarId}
            alt={name}
          >
            <AvatarImage width={80} quality={70} />
            <AvatarFallback name={name} className="text-sm" />
          </Avatar>
          <span className="text-lg font-semibold">{name}</span>
        </div>

        <div className="flex grow flex-col items-center justify-center">
          <CountdownDisplay
            timeRemaining={timeRemaining ?? state.prelimTime * 1000}
            maxSeconds={state.prelimTime}
            isRunning={isTimerActive}
            isFinished={isFinished ?? false}
            className="text-[20vw]"
          />
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center border-t px-4 py-2">
          <div className="min-w-0">
            {nextResolved && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground shrink-0 text-xs">
                  next
                </span>
                <Avatar
                  className="size-5 shrink-0"
                  cloudflareId={nextResolved.avatarId}
                  alt={nextResolved.name ?? "Unknown"}
                >
                  <AvatarImage width={40} quality={60} />
                  <AvatarFallback
                    name={nextResolved.name ?? "Unknown"}
                    className="text-[10px]"
                  />
                </Avatar>
                <span className="truncate text-sm font-medium">
                  {nextResolved.name ?? "Unknown"}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <Button variant="destructive" onClick={markDQ}>
                disqualify
              </Button>
              <Button onClick={toggleTimer}>
                {isFinished ? (
                  <>
                    <RotateCcwIcon className="size-3.5" />
                    Reset
                  </>
                ) : isTimerActive ? (
                  <>
                    <PauseIcon className="size-3.5" />
                    Pause
                  </>
                ) : (
                  <>
                    <PlayIcon className="size-3.5" />
                    {isPaused ? "Resume" : "Start"}
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={markDone}
                disabled={isTimerActive}
              >
                next
              </Button>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hidden sm:block">
                  <InfoIcon className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <kbd className="bg-muted rounded px-1 font-mono text-[10px]">
                  Space
                </kbd>{" "}
                start/stop{" "}
                <kbd className="bg-muted rounded px-1 font-mono text-[10px]">
                  R
                </kbd>{" "}
                reset
              </TooltipContent>
            </Tooltip>
          </div>

          <div />
        </div>
      </div>
    </>
  );
}

function findNextPending(state: {
  riders: TournamentRider[];
  prelimStatuses: Record<number, PrelimStatus>;
  currentRiderIndex: number | null;
}): number | null {
  const afterIndex = state.currentRiderIndex ?? -1;
  for (let i = afterIndex + 1; i < state.riders.length; i++) {
    if (!state.prelimStatuses[i]) return i;
  }
  for (let i = 0; i <= afterIndex; i++) {
    if (!state.prelimStatuses[i]) return i;
  }
  return null;
}
