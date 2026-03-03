import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import {
  MaximizeIcon,
  MinimizeIcon,
  RotateCcwIcon,
  TrophyIcon,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { PageHeader } from "~/components/page-header"
import { BracketContainer, FitText } from "~/components/tourney/bracket-graph"
import {
  SplitTimer,
  type TimerSyncEvent,
} from "~/components/tourney/split-timer"
import { Button } from "~/components/ui/button"
import { tourney } from "~/lib/tourney"
import { decodeWinners } from "~/lib/tourney/bracket"
import {
  applyWinners,
  generateBracket,
  getRiderName,
  getWinnerName,
  type Match,
} from "~/lib/tourney/bracket-logic"
import { useAdminHeartbeat, useBracketAction } from "~/lib/tourney/hooks"
import { useChampionCelebration } from "~/lib/tourney/use-champion-celebration"
import { users as usersApi } from "~/lib/users"

export const Route = createFileRoute("/_authed/tourney/$code/bracket")({
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const tournament = await context.queryClient.ensureQueryData(
      tourney.get.queryOptions({ code: params.code }),
    )
    if (tournament.createdByUserId !== context.user.id) {
      throw redirect({ to: "/tourney" })
    }
  },
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        tourney.get.queryOptions({ code: params.code }),
      ),
      context.queryClient.ensureQueryData(usersApi.all.queryOptions()),
    ])
  },
})

function RouteComponent() {
  const { code } = Route.useParams()
  useAdminHeartbeat(code)
  const { data: tournament } = useSuspenseQuery(
    tourney.get.queryOptions({ code }),
  )
  const { data: allUsers } = useSuspenseQuery(usersApi.all.queryOptions())

  const bracketAction = useBracketAction(code)

  const { state } = tournament

  // Clear any stale timer left from a previous session. The state machine's
  // exit actions handle cleanup on phase transitions automatically, but if the
  // admin refreshed mid-timer we still need a one-shot mount-time reset.
  const clearedStaleTimer = useRef(false)
  useEffect(() => {
    if (state.timer?.matchId && !clearedStaleTimer.current) {
      clearedStaleTimer.current = true
      bracketAction.mutate({
        data: { code, action: { type: "resetTimer" } },
      })
    }
    // oxlint-disable-next-line react/exhaustive-deps -- run once on mount
  }, [])

  const usersMap = useMemo(() => {
    const map = new Map<
      number,
      { id: number; name: string; avatarId: string | null }
    >()
    for (const user of allUsers) map.set(user.id, user)
    return map
  }, [allUsers])

  // Resolve bracket rider names
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

  const containerRef = useRef<HTMLDivElement>(null)
  const [activeTimer, setActiveTimer] = useState<{
    match: Match
    duration: number
  } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      containerRef.current.requestFullscreen()
    }
  }, [])

  const selectWinner = useCallback(
    (matchId: string, winner: 1 | 2) => {
      bracketAction.mutate({
        data: {
          code,
          action: { type: "selectWinner", matchId, winner },
        },
      })
    },
    [bracketAction, code],
  )

  const reset = useCallback(() => {
    bracketAction.mutate({
      data: { code, action: { type: "resetBracket" } },
    })
  }, [bracketAction, code])

  const openTimer = useCallback(
    (match: Match, duration: number) => {
      setActiveTimer({ match, duration })
      bracketAction.mutate({
        data: {
          code,
          action: { type: "openTimer", matchId: match.id, duration },
        },
      })
    },
    [bracketAction, code],
  )

  const closeTimer = useCallback(() => {
    bracketAction.mutate({
      data: { code, action: { type: "resetTimer" } },
    })
    setActiveTimer(null)
  }, [bracketAction, code])

  const activeTimerRef = useRef(activeTimer)
  activeTimerRef.current = activeTimer

  const syncTimer = useCallback(
    (event: TimerSyncEvent) => {
      const match = activeTimerRef.current?.match
      if (!match) return
      switch (event.type) {
        case "start": {
          bracketAction.mutate({
            data: {
              code,
              action: {
                type: "startTimer",
                matchId: match.id,
                side: event.side,
                duration: event.duration,
                otherRemaining: event.otherRemaining,
              },
            },
          })
          break
        }
        case "reset": {
          bracketAction.mutate({
            data: { code, action: { type: "softResetTimer" } },
          })
          break
        }
        case "swap": {
          bracketAction.mutate({
            data: { code, action: { type: "swapSides" } },
          })
          break
        }
      }
    },
    [bracketAction, code],
  )

  const rounds = Math.max(...matches.map((m) => m.round), 0)
  const finalMatch = matches.find((m) => m.round === rounds && m.id !== "3rd")
  const champion = finalMatch ? getWinnerName(finalMatch) : null

  const showCelebration = state.celebrating
  const { canvasRef } = useChampionCelebration(champion)

  if (resolvedRiders.length < 2) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        <TrophyIcon className="text-muted-foreground size-12" />
        <p className="text-muted-foreground text-center">
          No participants configured
        </p>
        <Button asChild>
          <Link to="/tourney">setup</Link>
        </Button>
      </div>
    )
  }

  const timerHeader = activeTimer ? (
    <>
      <span className="text-sm font-medium">
        {getRiderName(activeTimer.match.player1)} vs{" "}
        {getRiderName(activeTimer.match.player2)}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="icon-xs"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <MinimizeIcon className="size-3.5" />
          ) : (
            <MaximizeIcon className="size-3.5" />
          )}
        </Button>
      </div>
    </>
  ) : null

  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tourney">tourney</PageHeader.Crumb>
          <PageHeader.Crumb>{tournament.name || "bracket"}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Right>
          <PageHeader.Actions>
            {!activeTimer && !showCelebration && (
              <>
                {champion && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      bracketAction.mutate({
                        data: { code, action: { type: "showCelebration" } },
                      })
                    }
                    className="gap-2"
                  >
                    <TrophyIcon className="size-4 text-yellow-500" />
                    {champion}
                  </Button>
                )}
                <span className="text-muted-foreground font-mono text-xs">
                  {code}
                </span>
                <Button
                  variant="secondary"
                  size="icon-xs"
                  onClick={reset}
                  aria-label="reset bracket"
                >
                  <RotateCcwIcon className="size-3.5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon-xs"
                  onClick={toggleFullscreen}
                  aria-label={
                    isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                  }
                >
                  {isFullscreen ? (
                    <MinimizeIcon className="size-3.5" />
                  ) : (
                    <MaximizeIcon className="size-3.5" />
                  )}
                </Button>
              </>
            )}
            {showCelebration && champion && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    bracketAction.mutate({
                      data: { code, action: { type: "dismissCelebration" } },
                    })
                  }
                >
                  Bracket
                </Button>
                <Button
                  variant="secondary"
                  size="icon-xs"
                  onClick={reset}
                  aria-label="reset bracket"
                >
                  <RotateCcwIcon className="size-3.5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon-xs"
                  onClick={toggleFullscreen}
                  aria-label={
                    isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                  }
                >
                  {isFullscreen ? (
                    <MinimizeIcon className="size-3.5" />
                  ) : (
                    <MaximizeIcon className="size-3.5" />
                  )}
                </Button>
              </>
            )}
          </PageHeader.Actions>
        </PageHeader.Right>
      </PageHeader>
      <div ref={containerRef} className="bg-background flex h-full flex-col">
        {activeTimer ? (
          <SplitTimer
            key={activeTimer.match.id}
            rider1={activeTimer.match.player1 ?? undefined}
            rider2={activeTimer.match.player2 ?? undefined}
            time={activeTimer.duration}
            headerContent={timerHeader}
            onSync={syncTimer}
            onClose={closeTimer}
          />
        ) : showCelebration && champion ? (
          <div className="flex flex-1 items-center justify-center overflow-hidden px-8">
            <FitText text={champion} />
          </div>
        ) : (
          <BracketContainer
            matches={matches}
            stageTimes={stageTimes}
            selectWinner={selectWinner}
            onOpenTimer={openTimer}
            interactive
          />
        )}
        <canvas
          ref={canvasRef}
          className="pointer-events-none fixed inset-0 z-50 h-dvh w-dvw"
        />
      </div>
    </>
  )
}
