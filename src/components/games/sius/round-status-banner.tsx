import { AlertTriangleIcon, ArchiveIcon } from "lucide-react"
import pluralize from "pluralize"

type RoundStatusBannerProps = {
  status: "active" | "archived" | "flagged"
  roundLength?: number
  voteCount?: number
}

export function RoundStatusBanner({
  status,
  roundLength = 0,
}: RoundStatusBannerProps) {
  if (status === "flagged") {
    return (
      <div className="text-destructive flex items-center gap-2 text-sm">
        <AlertTriangleIcon className="size-4" />
        <span>round paused — a set has been flagged for review</span>
      </div>
    )
  }

  if (status === "archived") {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <ArchiveIcon className="size-4" />
        <span>
          archived with {roundLength} {pluralize("trick", roundLength)}
        </span>
      </div>
    )
  }

  return null
}
