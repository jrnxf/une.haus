import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useCallback, useMemo } from "react"

import { BracketContainer, FitText } from "~/components/tourney/bracket-graph"
import { CountdownDisplay } from "~/components/tourney/countdown-display"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { seo } from "~/lib/seo"
import { tourney } from "~/lib/tourney"
import { decodeWinners } from "~/lib/tourney/bracket"
import {
  applyWinners,
  generateBracket,
  getWinnerName,
  type Match,
} from "~/lib/tourney/bracket-logic"
import { useSyncedTimer } from "~/lib/tourney/hooks"
import { findNextPending } from "~/lib/tourney/machine"
import { type TournamentState } from "~/lib/tourney/types"
import { useChampionCelebration } from "~/lib/tourney/use-champion-celebration"
import { useTourneySSE } from "~/lib/tourney/use-tourney-sse"
import { users as usersApi } from "~/lib/users"
import { cn } from "~/lib/utils"

export const Route = createFileRoute("/tourney/$code/live")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    const [tournament] = await Promise.all([
      context.queryClient.ensureQueryData(
        tourney.get.queryOptions({ code: params.code }),
      ),
      context.queryClient.ensureQueryData(usersApi.all.queryOptions()),
    ])
    return { tournament }
  },
  head: ({ loaderData }) => {
    const tournament = loaderData?.tournament
    if (!tournament) return {}

    return seo({
      title: tournament.name,
      description: "Tournament on une.haus",
      path: `/tourney/${tournament.code}/live`,
    })
  },
})

function RouteComponent() {
  const { code } = Route.useParams()
  const { adminConnected } = useTourneySSE(code)
  const { data: tournament } = useSuspenseQuery(
    tourney.get.queryOptions({ code }),
  )
  const { data: allUsers } = useSuspenseQuery(usersApi.all.queryOptions())

  const usersMap = useMemo(() => {
    const map = new Map<
      number,
      { id: number; name: string; avatarId: string | null }
    >()
    for (const user of allUsers) map.set(user.id, user)
    return map
  }, [allUsers])

  const resolveName = useCallback(
    (rider: { userId: number | null; name: string | null }) => {
      if (rider.userId !== null) {
        const user = usersMap.get(rider.userId)
        return user?.name ?? rider.name ?? "Unknown"
      }
      return rider.name ?? "Unknown"
    },
    [usersMap],
  )

  const resolveRider = useCallback(
    (rider: { userId: number | null; name: string | null }) => {
      if (rider.userId !== null) {
        const user = usersMap.get(rider.userId)
        return {
          userId: rider.userId,
          name: user?.name ?? rider.name,
          avatarId: user?.avatarId ?? null,
        }
      }
      return { userId: null, name: rider.name, avatarId: null }
    },
    [usersMap],
  )

  const { phase, state } = tournament

  return (
    <div className="bg-background fixed inset-0 z-50 flex flex-col">
      {phase === "setup" && <SetupView name={tournament.name} code={code} />}
      {phase === "prelims" && (
        <PrelimsView
          state={state}
          resolveName={resolveName}
          resolveRider={resolveRider}
          code={code}
        />
      )}
      {phase === "ranking" && (
        <RankingView name={tournament.name} code={code} />
      )}
      {(phase === "bracket" || phase === "complete") && (
        <BracketView state={state} usersMap={usersMap} code={code} />
      )}

      {!adminConnected && (
        <div className="bg-background/80 fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm">
          <div className="space-y-2 text-center">
            <p className="text-muted-foreground text-xl font-semibold">
              tournament paused
            </p>
            <p className="text-muted-foreground/70 text-sm">
              waiting for host to resume...
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function SetupView({ name, code }: { name: string; code: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-bold">{name}</h1>
        <p className="text-muted-foreground">tournament starting soon...</p>
        <p className="font-mono text-2xl tracking-widest">{code}</p>
      </div>
    </div>
  )
}

function PrelimsView({
  state,
  resolveName,
  resolveRider,
}: {
  state: TournamentState
  resolveName: (rider: { userId: number | null; name: string | null }) => string
  resolveRider: (rider: { userId: number | null; name: string | null }) => {
    userId: number | null
    name: string | null
    avatarId: string | null
  }
  code: string
}) {
  const timerActive = state.currentRiderIndex !== null
  const timeRemaining = useSyncedTimer(state.timer)
  const isTimerRunning = state.timer?.active ?? false
  const isFinished =
    timeRemaining !== null && timeRemaining <= 0 && !isTimerRunning
  const isLow = (timeRemaining ?? 0) <= 10_000 && isTimerRunning

  const currentRider = timerActive
    ? state.riders[state.currentRiderIndex!]
    : null
  const currentResolved = currentRider ? resolveRider(currentRider) : null
  const currentName = currentResolved?.name ?? "Unknown"

  // Derive the next pending rider for the "up next" bar
  const nextPendingIndex = useMemo(() => {
    if (state.currentRiderIndex === null) return null
    return findNextPending(
      state.riders.length,
      state.prelimStatuses,
      state.currentRiderIndex,
    )
  }, [state.riders.length, state.prelimStatuses, state.currentRiderIndex])

  const nextPendingName = useMemo(() => {
    if (nextPendingIndex === null) return null
    return resolveName(state.riders[nextPendingIndex])
  }, [nextPendingIndex, state.riders, resolveName])

  const roster = (
    <div className="flex-1 overflow-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold">prelims</h2>
        <div className="mt-4 divide-y rounded-lg border">
          {state.riders.map((rider, index) => {
            const status = state.prelimStatuses[index] ?? "pending"
            const name = resolveName(rider)
            const isCurrent = state.currentRiderIndex === index

            return (
              <div key={index} className="flex items-center gap-3 px-3 py-2">
                <div
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    status === "done" && "bg-green-500",
                    status === "dq" && "bg-destructive",
                    isCurrent && "bg-primary animate-pulse",
                    status === "pending" &&
                      !isCurrent &&
                      "bg-muted-foreground/30",
                  )}
                />
                <span
                  className={cn(
                    "text-sm font-medium",
                    status === "dq" && "line-through opacity-50",
                    isCurrent && "text-primary font-semibold",
                  )}
                >
                  {name}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  const timer = timerActive && currentResolved && (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center transition-colors duration-200",
        isTimerRunning && !isLow && "bg-primary/5",
        isLow && !isFinished && "bg-yellow-500/10",
        isFinished && "bg-destructive/20",
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar
          className="size-12"
          cloudflareId={currentResolved.avatarId}
          alt={currentName}
        >
          <AvatarImage width={96} quality={70} />
          <AvatarFallback name={currentName} />
        </Avatar>
        <span className="text-xl font-semibold">{currentName}</span>
      </div>
      <CountdownDisplay
        timeRemaining={timeRemaining ?? state.prelimTime * 1000}
        maxSeconds={state.prelimTime}
        isRunning={isTimerRunning}
        isFinished={isFinished ?? false}
        className="text-[20vw] md:text-[12vw]"
      />
    </div>
  )

  return (
    <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
      {/* Mobile layout: timer full-height OR roster */}
      <div className="flex flex-1 flex-col md:hidden">
        {timerActive ? (
          <>
            {timer}
            {nextPendingName && (
              <div className="border-t px-4 py-2 text-center">
                <span className="text-muted-foreground text-sm">
                  Up next:{" "}
                  <span className="text-foreground font-medium">
                    {nextPendingName}
                  </span>
                </span>
              </div>
            )}
          </>
        ) : (
          roster
        )}
      </div>

      {/* Tablet+ layout: timer slides out left, roster always right */}
      <div
        className={cn(
          "hidden overflow-hidden transition-all duration-300 ease-in-out md:flex",
          timerActive ? "md:w-2/3" : "md:w-0",
        )}
      >
        {timer}
      </div>
      <div className="hidden md:flex md:flex-1 md:flex-col md:border-l">
        {roster}
      </div>
    </div>
  )
}

function RankingView({ name }: { name: string; code: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold">{name}</h1>
        <p className="text-muted-foreground">judges are ranking riders...</p>
      </div>
    </div>
  )
}

function BracketView({
  state,
  usersMap,
  code,
}: {
  state: TournamentState
  usersMap: Map<number, { id: number; name: string; avatarId: string | null }>
  code: string
}) {
  const resolvedRiders = useMemo(() => {
    if (!state.bracketRiders) return []
    return state.bracketRiders.map((rider) => {
      if (rider.userId !== null) {
        const user = usersMap.get(rider.userId)
        return { userId: rider.userId, name: user?.name ?? rider.name }
      }
      return rider
    })
  }, [state.bracketRiders, usersMap])

  const winnersMap = useMemo(
    () => decodeWinners(state.winners ?? null),
    [state.winners],
  )

  const matches = useMemo(() => {
    const bracket = generateBracket(resolvedRiders)
    return applyWinners(bracket, winnersMap)
  }, [resolvedRiders, winnersMap])

  const stageTimes = useMemo(
    () => ({ battle: state.battleTime, finals: state.finalsTime }),
    [state.battleTime, state.finalsTime],
  )

  const rounds = Math.max(...matches.map((m) => m.round), 0)
  const finalMatch = matches.find((m) => m.round === rounds && m.id !== "3rd")
  const champion = finalMatch ? getWinnerName(finalMatch) : null

  const { canvasRef } = useChampionCelebration(champion)

  // Find the active timer match for battle timer display
  const timerMatch = useMemo(() => {
    if (!state.timer?.matchId) return null
    return matches.find((m) => m.id === state.timer?.matchId) ?? null
  }, [state.timer, matches])

  // No-op handlers for read-only bracket
  const noop = useCallback(() => {}, [])
  const noopTimer = useCallback((_match: Match, _duration: number) => {}, [])

  // Show battle timer when admin has one active
  if (timerMatch && state.timer) {
    return (
      <div className="flex flex-1 flex-col">
        <BattleTimerView state={state} match={timerMatch} usersMap={usersMap} />
        <canvas
          ref={canvasRef}
          className="pointer-events-none fixed inset-0 z-50 h-dvh w-dvw"
        />
      </div>
    )
  }

  // Show celebration when synced state says so
  if (state.celebrating && champion) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center overflow-hidden px-8">
          <FitText text={champion} />
        </div>
        <canvas
          ref={canvasRef}
          className="pointer-events-none fixed inset-0 z-50 h-dvh w-dvw"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <BracketContainer
        matches={matches}
        stageTimes={stageTimes}
        selectWinner={noop as (matchId: string, winner: 1 | 2) => void}
        onOpenTimer={noopTimer}
        interactive={false}
        code={code}
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-50 h-dvh w-dvw"
      />
    </div>
  )
}

function BattleTimerView({
  state,
  match,
  usersMap,
}: {
  state: TournamentState
  match: Match
  usersMap: Map<number, { id: number; name: string; avatarId: string | null }>
}) {
  const activeTimeRemaining = useSyncedTimer(state.timer)
  const isTimerActive = state.timer?.active ?? false
  const activeSide = state.timer?.side ?? 1
  const maxSeconds = state.timer?.duration || 60
  const swapped = state.timer?.swapped ?? false

  const otherRemaining = state.timer?.otherSideRemaining ?? null

  // Derive per-side state
  const side1Remaining =
    activeSide === 1
      ? (activeTimeRemaining ?? maxSeconds * 1000)
      : (otherRemaining ?? maxSeconds * 1000)
  const side2Remaining =
    activeSide === 2
      ? (activeTimeRemaining ?? maxSeconds * 1000)
      : (otherRemaining ?? maxSeconds * 1000)

  const side1Finished = side1Remaining <= 0
  const side2Finished = side2Remaining <= 0
  const side1Running = isTimerActive && activeSide === 1 && !side1Finished
  const side2Running = isTimerActive && activeSide === 2 && !side2Finished
  const side1Low = side1Remaining <= 10_000 && side1Running
  const side2Low = side2Remaining <= 10_000 && side2Running

  const resolveRider = useCallback(
    (
      player: { userId: number | null; name: string | null } | null | undefined,
    ) => {
      if (!player) return { name: "TBD", avatarId: null }
      if (player.userId !== null) {
        const user = usersMap.get(player.userId)
        return {
          name: user?.name ?? player.name ?? "Unknown",
          avatarId: user?.avatarId ?? null,
        }
      }
      return { name: player.name ?? "Unknown", avatarId: null }
    },
    [usersMap],
  )

  // Respect swapped flag from admin
  const leftRider = swapped
    ? resolveRider(match.player2)
    : resolveRider(match.player1)
  const rightRider = swapped
    ? resolveRider(match.player1)
    : resolveRider(match.player2)
  const leftRemaining = swapped ? side2Remaining : side1Remaining
  const rightRemaining = swapped ? side1Remaining : side2Remaining
  const leftRunning = swapped ? side2Running : side1Running
  const rightRunning = swapped ? side1Running : side2Running
  const leftFinished = swapped ? side2Finished : side1Finished
  const rightFinished = swapped ? side1Finished : side2Finished
  const leftLow = swapped ? side2Low : side1Low
  const rightLow = swapped ? side1Low : side2Low

  return (
    <div className="relative flex flex-1 flex-col md:flex-row">
      {/* Vertical divider (desktop) */}
      <div className="bg-border absolute top-0 bottom-0 left-1/2 hidden w-px md:block" />

      {/* Left / Top side */}
      <div
        className={cn(
          "relative flex flex-1 flex-col items-center justify-center transition-colors duration-200",
          leftFinished && "bg-destructive/20",
          leftLow && "bg-yellow-500/10",
          leftRunning && !leftLow && "bg-primary/5",
        )}
      >
        <div className="absolute top-4 left-4 flex items-center gap-2">
          {leftRider.avatarId && (
            <Avatar
              className="size-8"
              cloudflareId={leftRider.avatarId}
              alt={leftRider.name}
            >
              <AvatarImage width={64} quality={90} />
              <AvatarFallback name={leftRider.name} />
            </Avatar>
          )}
          <span className="text-lg font-semibold">{leftRider.name}</span>
        </div>
        <CountdownDisplay
          timeRemaining={leftRemaining}
          maxSeconds={maxSeconds}
          isRunning={leftRunning}
          isFinished={leftFinished}
          className="text-[12vw]"
        />
        <div className="text-muted-foreground absolute bottom-4 text-sm">
          {leftRunning && "running"}
          {!leftRunning &&
            !leftFinished &&
            leftRemaining > 0 &&
            leftRemaining < maxSeconds * 1000 &&
            "paused"}
          {leftFinished && "finished"}
          {!leftRunning &&
            !leftFinished &&
            leftRemaining === maxSeconds * 1000 &&
            "waiting"}
        </div>
      </div>

      {/* Horizontal divider (mobile) */}
      <div className="bg-border h-px md:hidden" />

      {/* Right / Bottom side */}
      <div
        className={cn(
          "relative flex flex-1 flex-col items-center justify-center transition-colors duration-200",
          rightFinished && "bg-destructive/20",
          rightLow && "bg-yellow-500/10",
          rightRunning && !rightLow && "bg-primary/5",
        )}
      >
        <div className="absolute top-4 right-4 flex items-center gap-2 md:left-auto">
          <span className="text-lg font-semibold md:hidden">
            {rightRider.name}
          </span>
          {rightRider.avatarId && (
            <Avatar
              className="size-8"
              cloudflareId={rightRider.avatarId}
              alt={rightRider.name}
            >
              <AvatarImage width={64} quality={90} />
              <AvatarFallback name={rightRider.name} />
            </Avatar>
          )}
          <span className="hidden text-lg font-semibold md:block">
            {rightRider.name}
          </span>
        </div>
        <CountdownDisplay
          timeRemaining={rightRemaining}
          maxSeconds={maxSeconds}
          isRunning={rightRunning}
          isFinished={rightFinished}
          className="text-[12vw]"
        />
        <div className="text-muted-foreground absolute bottom-4 text-sm">
          {rightRunning && "running"}
          {!rightRunning &&
            !rightFinished &&
            rightRemaining > 0 &&
            rightRemaining < maxSeconds * 1000 &&
            "paused"}
          {rightFinished && "finished"}
          {!rightRunning &&
            !rightFinished &&
            rightRemaining === maxSeconds * 1000 &&
            "waiting"}
        </div>
      </div>
    </div>
  )
}
