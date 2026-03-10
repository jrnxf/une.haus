import { type PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/components/ui/hover-card"
import { cn } from "~/lib/utils"

function pluralize(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`
}

const shortDateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const isInFuture = diff < 0
  const absDiff = Math.abs(diff)

  const seconds = Math.floor(absDiff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 5) return "just now"

  if (isInFuture) {
    if (seconds < 60) return `in ${pluralize(seconds, "second")}`
    if (minutes < 60) return `in ${pluralize(minutes, "minute")}`
    if (hours < 24) return `in ${pluralize(hours, "hour")}`
    if (days < 7) return `in ${pluralize(days, "day")}`
    return shortDateFormat.format(date)
  }

  if (seconds < 60) return `${pluralize(seconds, "second")} ago`
  if (minutes < 60) return `${pluralize(minutes, "minute")} ago`
  if (hours < 24) return `${pluralize(hours, "hour")} ago`
  if (days < 7) return `${pluralize(days, "day")} ago`
  return shortDateFormat.format(date)
}

type TimezoneCardProps = {
  date: Date
  timezone?: string
} & React.ComponentProps<"div">

function TimezoneCard(props: TimezoneCardProps) {
  const { date, timezone, ...cardProps } = props

  const locale = React.useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().locale,
    [],
  )

  const timezoneName = React.useMemo(
    () =>
      timezone ??
      new Intl.DateTimeFormat(locale, { timeZoneName: "shortOffset" })
        .formatToParts(date)
        .find((part) => part.type === "timeZoneName")?.value,
    [date, timezone, locale],
  )

  const { formattedDate, formattedTime } = React.useMemo(
    () => ({
      formattedDate: new Intl.DateTimeFormat(locale, {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: timezone,
      }).format(date),
      formattedTime: new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: timezone,
      }).format(date),
    }),
    [date, timezone, locale],
  )

  return (
    <div
      role="region"
      aria-label={`Time in ${timezoneName}: ${formattedDate} ${formattedTime}`}
      {...cardProps}
      className="text-muted-foreground flex items-center justify-between gap-2 text-sm"
    >
      <span className="bg-accent w-fit rounded px-1 text-xs font-medium">
        {timezoneName}
      </span>
      <div className="flex items-center gap-2">
        <time dateTime={date.toISOString()}>{formattedDate}</time>
        <time className="tabular-nums" dateTime={date.toISOString()}>
          {formattedTime}
        </time>
      </div>
    </div>
  )
}

const triggerVariants = cva(
  "text-foreground/70 hover:text-foreground/90 focus-visible:ring-ring/50 inline-flex w-fit items-center justify-center rounded-md text-sm outline-none focus-visible:ring-3",
  {
    variants: {
      variant: {
        default: "",
        muted: "text-foreground/50 hover:text-foreground/70",
        ghost: "hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

type RelativeTimeCardProps = {
  date: Date | string | number
  timezones?: string[]
  updateInterval?: number
  delay?: number
  closeDelay?: number
  side?: PreviewCardPrimitive.Positioner.Props["side"]
  align?: PreviewCardPrimitive.Positioner.Props["align"]
  sideOffset?: PreviewCardPrimitive.Positioner.Props["sideOffset"]
  alignOffset?: PreviewCardPrimitive.Positioner.Props["alignOffset"]
} & Omit<React.ComponentProps<"button">, "children"> &
  Pick<
    PreviewCardPrimitive.Root.Props,
    "open" | "defaultOpen" | "onOpenChange"
  > &
  VariantProps<typeof triggerVariants>

function RelativeTimeCard(props: RelativeTimeCardProps) {
  const {
    date: dateProp,
    variant,
    timezones = ["UTC"],
    open,
    defaultOpen,
    onOpenChange,
    delay = 500,
    closeDelay = 300,
    align,
    side,
    alignOffset,
    sideOffset,
    updateInterval = 1000,
    className,
    ...triggerProps
  } = props

  const date = React.useMemo(
    () => (dateProp instanceof Date ? dateProp : new Date(dateProp)),
    [dateProp],
  )

  const locale = React.useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().locale,
    [],
  )

  const [formattedTime, setFormattedTime] = React.useState<string>(() =>
    formatRelativeTime(date),
  )

  React.useEffect(() => {
    setFormattedTime(formatRelativeTime(date))
    const timer = setInterval(() => {
      setFormattedTime(formatRelativeTime(date))
    }, updateInterval)

    return () => clearInterval(timer)
  }, [date, updateInterval])

  return (
    <HoverCard
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
      <HoverCardTrigger
        delay={delay}
        closeDelay={closeDelay}
        render={
          <button
            type="button"
            {...triggerProps}
            className={cn(triggerVariants({ variant, className }))}
          />
        }
      >
        <time
          dateTime={date.toISOString()}
          suppressHydrationWarning
          className="lowercase"
        >
          {formattedTime}
        </time>
      </HoverCardTrigger>
      <HoverCardContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className="flex w-full max-w-[420px] flex-col gap-2 p-3 lowercase"
      >
        <time
          dateTime={date.toISOString()}
          className="text-sm"
          suppressHydrationWarning
        >
          {new Intl.DateTimeFormat(locale, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(date)}
        </time>
        <div role="list" className="flex flex-col gap-1">
          {timezones.map((timezone) => (
            <TimezoneCard
              key={timezone}
              role="listitem"
              date={date}
              timezone={timezone}
            />
          ))}
          <TimezoneCard role="listitem" date={date} />
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

export { RelativeTimeCard }
