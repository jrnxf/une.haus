import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { cn } from "~/lib/utils"

// A ring that fills as a member spends today's ask budget. used is a whole
// percent. It turns red when little is left.
export function AskMeter({ used }: { used: number }) {
  const left = 100 - used
  const label = `${left}% of today's limit left`
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            role="img"
            aria-label={label}
            className="flex size-4 items-center justify-center"
          />
        }
      >
        <svg viewBox="0 0 20 20" className="size-4 -rotate-90" aria-hidden>
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            strokeWidth="2.5"
            className="stroke-border"
          />
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            strokeWidth="2.5"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 - used}
            className={cn(
              "transition-all duration-500",
              used >= 95 ? "stroke-destructive" : "stroke-muted-foreground",
            )}
          />
        </svg>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}
