import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { GripVerticalIcon } from "lucide-react"
import { useCallback, useMemo, useState } from "react"

import { PageHeader } from "~/components/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from "~/components/ui/sortable"
import { tourney } from "~/lib/tourney"
import { useAdvancePhase, useRankingAction } from "~/lib/tourney/hooks"
import { type TournamentRider } from "~/lib/tourney/types"
import { AdminPresence } from "~/lib/tourney/use-admin-presence"
import { users as usersApi } from "~/lib/users"
import { cn } from "~/lib/utils"

export const Route = createFileRoute("/_authed/tourney/$code/ranking")({
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

type RankedRider = {
  orderId: string
  originalIndex: number
  rider: TournamentRider
}

function RouteComponent() {
  const { code } = Route.useParams()
  const { data: tournament } = useSuspenseQuery(
    tourney.get.queryOptions({ code }),
  )
  const { data: allUsers } = useSuspenseQuery(usersApi.all.queryOptions())

  const rankingAction = useRankingAction(code)
  const advancePhase = useAdvancePhase(code)

  const { state } = tournament

  const usersMap = useMemo(() => {
    const map = new Map<
      number,
      { id: number; name: string; avatarId: string | null }
    >()
    for (const user of allUsers) map.set(user.id, user)
    return map
  }, [allUsers])

  const resolveRider = useCallback(
    (rider: TournamentRider) => {
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

  // Build list of completed (non-DQ'd) riders preserving original order
  const completedRiders = useMemo(() => {
    return state.riders
      .map((rider, index) => ({ rider, index }))
      .filter(({ index }) => state.prelimStatuses[index] === "done")
      .map(({ rider, index }) => ({
        orderId: `rider-${index}`,
        originalIndex: index,
        rider,
      }))
  }, [state.riders, state.prelimStatuses])

  const [orderedRiders, setOrderedRiders] =
    useState<RankedRider[]>(completedRiders)
  const advancingCount = Math.min(state.bracketSize, orderedRiders.length)

  const handleStart = () => {
    const ranking = orderedRiders.map((r) => r.originalIndex)
    // Save ranking then advance to bracket
    rankingAction.mutate(
      { data: { code, ranking } },
      {
        onSuccess: () => {
          advancePhase.mutate({
            data: { code, phase: "bracket" },
          })
        },
      },
    )
  }

  return (
    <>
      <AdminPresence code={code} />
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tourney">tourney</PageHeader.Crumb>
          <PageHeader.Crumb>ranking</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Right>
          <span className="text-muted-foreground font-mono text-xs">
            {code}
          </span>
        </PageHeader.Right>
      </PageHeader>
      <div className="mx-auto w-full max-w-5xl space-y-4 p-4">
        <div>
          <h2 className="text-lg font-semibold">ranking</h2>
          <p className="text-muted-foreground text-sm">
            drag to rank riders. top {advancingCount} advance to the bracket.
          </p>
        </div>

        <Sortable
          value={orderedRiders}
          onValueChange={setOrderedRiders}
          getItemValue={(item) => item.orderId}
          className="space-y-1"
        >
          {orderedRiders.map((item, index) => {
            const resolved = resolveRider(item.rider)
            const name = resolved.name ?? "Unknown"
            const advancing = index < advancingCount

            return (
              <SortableItem
                key={item.orderId}
                value={item.orderId}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-1.5",
                  advancing
                    ? "border-primary/20 bg-primary/5"
                    : "bg-muted/70 border-transparent opacity-60",
                  index === advancingCount && "mt-3",
                )}
              >
                <SortableItemHandle>
                  <GripVerticalIcon className="text-muted-foreground size-3.5" />
                </SortableItemHandle>

                <span className="text-muted-foreground w-5 text-center text-xs font-medium tabular-nums">
                  {index + 1}
                </span>

                <Avatar
                  className="size-5"
                  cloudflareId={resolved.avatarId}
                  alt={name}
                >
                  <AvatarImage width={40} quality={60} />
                  <AvatarFallback name={name} />
                </Avatar>

                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {name}
                </span>
              </SortableItem>
            )
          })}
        </Sortable>

        {orderedRiders.length > advancingCount && (
          <div className="flex items-center gap-2">
            <div className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-xs">
              {orderedRiders.length - advancingCount} eliminated
            </span>
            <div className="bg-border h-px flex-1" />
          </div>
        )}

        <div className="flex justify-between">
          <Button
            variant="secondary"
            onClick={() =>
              advancePhase.mutate({
                data: { code, phase: "prelims" },
              })
            }
            disabled={rankingAction.isPending || advancePhase.isPending}
          >
            back
          </Button>
          <Button
            onClick={handleStart}
            disabled={rankingAction.isPending || advancePhase.isPending}
          >
            start
          </Button>
        </div>
      </div>
    </>
  )
}
