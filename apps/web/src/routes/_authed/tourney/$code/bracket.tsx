import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { GhostIcon } from "lucide-react"
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { confirm } from "~/components/confirm-dialog"
import { PageHeader } from "~/components/page-header"
import { BracketContainer, FitText } from "~/components/tourney/bracket-graph"
import {
  SplitTimer,
  type TimerSyncEvent,
} from "~/components/tourney/split-timer"
import { TourneyAdminMenu } from "~/components/tourney/tourney-admin-menu"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { DropdownMenuItem } from "~/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { tourney } from "~/lib/tourney"
import { decodeWinners } from "~/lib/tourney/bracket"
import {
  applyWinners,
  generateBracket,
  getWinnerName,
  type Match,
} from "~/lib/tourney/bracket-logic"
import { useAdvancePhase, useBracketAction } from "~/lib/tourney/hooks"
import { AdminPresence } from "~/lib/tourney/use-admin-presence"
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
  const { data: tournament } = useSuspenseQuery(
    tourney.get.queryOptions({ code }),
  )
  const { data: allUsers } = useSuspenseQuery(usersApi.all.queryOptions())

  const bracketAction = useBracketAction(code)
  const advancePhase = useAdvancePhase(code)

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
    confirm.open({
      title: "reset",
      description:
        "are you sure you want to reset the bracket? all match results will be lost.",
      confirmText: "reset",
      variant: "destructive",
      onConfirm: () => {
        bracketAction.mutate({
          data: { code, action: { type: "resetBracket" } },
        })
      },
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
      <>
        <AdminPresence code={code} />
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GhostIcon />
            </EmptyMedia>
            <EmptyTitle>no participants</EmptyTitle>
            <EmptyDescription>
              add at least two riders to start the bracket
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/tourney">setup</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </>
    )
  }

  return (
    <>
      <AdminPresence code={code} />
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tourney">tourney</PageHeader.Crumb>
          <PageHeader.Crumb>{tournament.name || "bracket"}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Right>
          <PageHeader.Actions>
            <Badge variant="secondary">{code}</Badge>
            <TourneyAdminMenu
              code={code}
              goTo={[
                {
                  label: "ranking",
                  onClick: () =>
                    advancePhase.mutate({
                      data: { code, phase: "ranking" },
                    }),
                  disabled: advancePhase.isPending,
                },
                ...(showCelebration
                  ? [
                      {
                        label: "bracket",
                        onClick: () =>
                          bracketAction.mutate({
                            data: {
                              code,
                              action: { type: "dismissCelebration" as const },
                            },
                          }),
                      },
                    ]
                  : []),
                ...(champion && !showCelebration
                  ? [
                      {
                        label: "winner",
                        onClick: () =>
                          bracketAction.mutate({
                            data: {
                              code,
                              action: { type: "showCelebration" as const },
                            },
                          }),
                      },
                    ]
                  : []),
              ]}
            >
              <DropdownMenuItem variant="destructive" onClick={reset}>
                reset
              </DropdownMenuItem>
            </TourneyAdminMenu>
          </PageHeader.Actions>
        </PageHeader.Right>
      </PageHeader>
      <div ref={containerRef} className="bg-background flex h-full flex-col">
        {activeTimer ? (
          <Suspense>
            <SplitTimer
              key={activeTimer.match.id}
              rider1={activeTimer.match.player1 ?? undefined}
              rider2={activeTimer.match.player2 ?? undefined}
              time={activeTimer.duration}
              onSync={syncTimer}
              onClose={closeTimer}
            />
          </Suspense>
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
            code={code}
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
