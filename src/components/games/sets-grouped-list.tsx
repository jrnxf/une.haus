import { useNavigate } from "@tanstack/react-router"
import pluralize from "pluralize"
import { type ReactNode } from "react"

import { SetCard } from "./set-card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion"
import { Metaline } from "~/components/ui/metaline"
import { type RankedRider } from "~/lib/games"
import { type RiderScore } from "~/lib/games/rius/ranking"
import { cn } from "~/lib/utils"

type SetData = {
  id: number
  name: string
  instructions: string | null
  createdAt: Date
  user: {
    id: number
    name: string
    avatarId: string | null
  }
  likes?: unknown[]
  submissions?: unknown[]
}

type SetsGroupedListProps = {
  rankedRiders: RankedRider<SetData>[]
  openUserId?: number
  basePath: string
  pathParams?: Record<string, string>
  searchParams?: Record<string, unknown>
}

function RiderStats({ ranking }: { ranking: RiderScore }) {
  const parts: ReactNode[] = []

  if (ranking.setsCount > 0) {
    parts.push(`${ranking.setsCount} ${pluralize("set", ranking.setsCount)}`)
  }
  if (ranking.submissionsCount > 0) {
    parts.push(
      `${ranking.submissionsCount} ${pluralize("submission", ranking.submissionsCount)}`,
    )
  }

  const pointsText = `${ranking.points} ${ranking.points === 1 ? "pt" : "pts"}`
  parts.push(pointsText)

  return <Metaline className="text-xs" parts={parts} />
}

export function SetsGroupedList({
  rankedRiders,
  openUserId,
  basePath,
  pathParams = {},
  searchParams = {},
}: SetsGroupedListProps) {
  const navigate = useNavigate()

  if (rankedRiders.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">no sets available</p>
      </div>
    )
  }

  return (
    <Accordion
      className="relative pl-10"
      value={openUserId ? [openUserId.toString()] : []}
      onValueChange={(value) => {
        const first = value[0]
        navigate({
          to: basePath,
          params: pathParams,
          search: {
            ...searchParams,
            open: first ? Number.parseInt(String(first), 10) : undefined,
          },
          replace: true,
        })
      }}
    >
      <div className="space-y-4">
        {rankedRiders.map(({ user, sets, ranking }, index) => (
          <div key={user.id} className="relative flex items-start">
            {/* Spine line */}
            {rankedRiders.length > 1 && (
              <div
                className={cn(
                  "bg-border absolute -left-[1.625rem] w-px",
                  index === 0 && "top-1/2 -bottom-2",
                  index === rankedRiders.length - 1 && "-top-2 bottom-1/2",
                  index > 0 &&
                    index < rankedRiders.length - 1 &&
                    "-top-2 -bottom-2",
                )}
              />
            )}

            {/* Ranked node */}
            <div
              className={cn(
                "absolute top-[17px] -left-10 flex size-7 items-center justify-center rounded-full border text-xs font-medium",
                ranking.rank === 1 &&
                  "border-yellow-600 bg-yellow-600 text-yellow-100 dark:border-yellow-700 dark:bg-yellow-700",
                ranking.rank === 2 &&
                  "border-gray-500 bg-gray-500 text-gray-100 dark:border-gray-600 dark:bg-gray-600",
                ranking.rank === 3 &&
                  "border-amber-700 bg-amber-700 text-amber-100 dark:border-amber-800 dark:bg-amber-800",
                ranking.rank > 3 &&
                  "bg-background border-border text-muted-foreground",
              )}
            >
              {ranking.rank}
            </div>

            <AccordionItem
              value={user.id.toString()}
              className="bg-card w-full overflow-hidden rounded-lg border last:border-b"
            >
              <AccordionTrigger className="[&[data-state=open]]:border-border items-center border-b border-transparent px-4 py-3 hover:no-underline [&[data-state=open]]:rounded-b-none">
                <div className="text-left">
                  <h3 className="text-sm font-medium">{user.name}</h3>
                  <RiderStats ranking={ranking} />
                </div>
              </AccordionTrigger>

              <AccordionContent className="p-3 pt-0">
                {sets.length > 0 ? (
                  <div className="flex flex-col gap-2 pt-3">
                    {sets.map((set) => (
                      <SetCard key={set.id} set={set} className="w-full" />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-2 pt-3 text-center text-xs">
                    submissions only
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          </div>
        ))}
      </div>
    </Accordion>
  )
}
