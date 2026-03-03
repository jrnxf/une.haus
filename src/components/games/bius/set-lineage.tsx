import { BiuSetCard } from "./set-card"
import { cn } from "~/lib/utils"

type Set = {
  id: number
  name: string
  position: number
  createdAt: Date
  deletedAt?: Date | null
  user: {
    id: number
    name: string
    avatarId: string | null
  }
  likes?: unknown[]
  messages?: unknown[]
  parentSet?: {
    id: number
    name: string
    user?: {
      id: number
      name: string
    }
  } | null
}

type SetLineageProps = {
  sets: Set[]
}

export function SetLineage({ sets }: SetLineageProps) {
  if (sets.length === 0) {
    return null
  }

  // Sets should already be ordered by position desc (newest first)
  // Find the latest non-deleted set for the "latest" badge
  const latestPosition =
    sets.find((s) => !s.deletedAt)?.position ?? sets[0]?.position ?? 0

  return (
    <div className="relative pl-10">
      <div className="space-y-4">
        {sets.map((set, index) => (
          <div key={set.id} className="relative flex items-center">
            {/* Line segment per item */}
            {sets.length > 1 && (
              <div
                className={cn(
                  "bg-border absolute -left-[1.625rem] w-px",
                  index === 0 && "top-1/2 -bottom-2",
                  index === sets.length - 1 && "-top-2 bottom-1/2",
                  index > 0 && index < sets.length - 1 && "-top-2 -bottom-2",
                )}
              />
            )}

            {/* Numbered node on the spine */}
            <div
              className={cn(
                "absolute -left-10 flex size-7 items-center justify-center rounded-full border text-xs font-medium",
                set.deletedAt
                  ? "border-border/50 bg-muted text-muted-foreground/50"
                  : "bg-background border-border text-muted-foreground",
              )}
            >
              {set.position}
            </div>

            {set.deletedAt ? (
              <div className="border-border/50 text-muted-foreground w-full rounded-lg border border-dashed px-4 py-3 text-sm italic">
                deleted
              </div>
            ) : (
              <BiuSetCard
                set={set}
                isLatest={set.position === latestPosition}
                className="w-full"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
