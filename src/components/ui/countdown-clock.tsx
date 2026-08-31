import { cva, type VariantProps } from "class-variance-authority"
import { useEffect, useState } from "react"

import { Kbd } from "~/components/ui/kbd"
import { cn } from "~/lib/utils"

const countdownClockVariants = cva("tabular-nums", {
  variants: {
    size: {
      xs: "h-5 px-1 text-xs",
      sm: "h-6 px-1.5 text-sm",
      md: "h-7 px-2 text-base",
    },
    variant: {
      default: "bg-primary text-primary-foreground",
      secondary: "bg-secondary text-secondary-foreground",
      destructive: "bg-destructive text-destructive-foreground",
      outline: "border-input bg-background text-foreground border",
      muted: "bg-muted text-muted-foreground",
    },
  },
  defaultVariants: {
    size: "xs",
    variant: "secondary",
  },
})

type CountdownClockProps = VariantProps<typeof countdownClockVariants> & {
  className?: string
  targetDate: Date
}

type TimeLeft = {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
}

function getTimeLeft(targetMs: number): TimeLeft {
  const diff = targetMs - Date.now()
  const totalSeconds = Math.max(0, Math.floor(diff / 1000))
  const days = Math.floor(totalSeconds / (24 * 60 * 60))
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
  const seconds = totalSeconds % 60

  return {
    days,
    hours,
    minutes,
    seconds,
    totalSeconds,
  }
}

function padTime(value: number) {
  return value.toString().padStart(2, "0")
}

function formatTimeText(timeLeft: TimeLeft) {
  if (timeLeft.totalSeconds <= 0) return "refresh"

  const parts: string[] = []
  if (timeLeft.days > 0) parts.push(`${timeLeft.days}d`)
  if (timeLeft.hours > 0 || timeLeft.days > 0)
    parts.push(`${padTime(timeLeft.hours)}h`)
  parts.push(`${padTime(timeLeft.minutes)}m`)
  parts.push(`${padTime(timeLeft.seconds)}s`)

  return parts.join(" ")
}

export function CountdownClock({
  targetDate,
  size,
  variant,
  className,
}: CountdownClockProps) {
  const targetMs = targetDate.getTime()
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(targetMs))

  useEffect(() => {
    setTimeLeft(getTimeLeft(targetMs))
    const id = setInterval(() => {
      setTimeLeft(getTimeLeft(targetMs))
    }, 1000)

    return () => clearInterval(id)
  }, [targetMs])

  const timeText = formatTimeText(timeLeft)

  return (
    <Kbd
      aria-live="polite"
      className={cn(countdownClockVariants({ size, variant }), className)}
    >
      {timeText}
    </Kbd>
  )
}
