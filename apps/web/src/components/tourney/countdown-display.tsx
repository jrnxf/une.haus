import { cn } from "~/lib/utils"

type CountdownDisplayProps = {
  timeRemaining: number
  maxSeconds: number
  isRunning: boolean
  isFinished: boolean
  className?: string
}

export function CountdownDisplay({
  timeRemaining,
  maxSeconds: _maxSeconds,
  isRunning,
  isFinished,
  className,
}: CountdownDisplayProps) {
  const isLow = timeRemaining <= 10_000 && isRunning
  const totalSeconds = Math.max(0, Math.floor(timeRemaining / 1000))
  const hundredths = Math.floor((timeRemaining % 1000) / 10)

  return (
    <div
      className={cn(
        "font-mono leading-none font-bold tabular-nums transition-colors",
        isFinished && "text-destructive",
        isLow && !isFinished && "text-yellow-500",
        className,
      )}
    >
      {totalSeconds}
      <span className="text-[0.18em] opacity-30">
        .{hundredths.toString().padStart(2, "0")}
      </span>
    </div>
  )
}
