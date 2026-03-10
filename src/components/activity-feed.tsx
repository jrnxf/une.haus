import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import {
  ArrowLeftRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EditIcon,
  FileTextIcon,
  GhostIcon,
  MergeIcon,
  MessageCircleIcon,
  StickyNoteIcon,
  VideoIcon,
} from "lucide-react"
import { useDeferredValue, useMemo, useState } from "react"

import { StackItUpIcon } from "~/components/icons/stack-it-up-icon"
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "~/components/reui/timeline"
import { RichText } from "~/components/rich-text"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { type ActivityItem, users } from "~/lib/users"
import { ACTIVITY_TYPES, type ActivityTypeFilter } from "~/lib/users/schemas"
import { cn } from "~/lib/utils"

const TYPE_LABELS: Record<ActivityTypeFilter, string> = {
  post: "posts",
  comment: "comments",
  riuSet: "riu sets",
  riuSubmission: "riu submissions",
  biuSet: "bius sets",
  trickSubmission: "trick submissions",
  trickSuggestion: "trick suggestions",
  trickVideo: "trick videos",
  utvVideoSuggestion: "vault suggestions",
  siuSet: "siu sets",
}

const ACTIVITY_ITEMS: Record<string, string> = {
  all: "all activity",
  ...TYPE_LABELS,
}

type ActivityGroup = {
  key: string
  items: ActivityItem[]
}

const SAME_DAY_SET_AND_SUBMISSION_TYPES: ReadonlySet<ActivityItem["type"]> =
  new Set(["riuSet", "riuSubmission", "biuSet", "trickSubmission", "siuSet"])

function getDescriptionPreview(content?: string | null): string | undefined {
  const trimmed = content?.trim()
  if (!trimmed) {
    return undefined
  }
  return trimmed.slice(0, 100)
}

function getLocalDayKey(dateValue: Date): string {
  const year = dateValue.getFullYear()
  const month = String(dateValue.getMonth() + 1).padStart(2, "0")
  const day = String(dateValue.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getGroupKey(item: ActivityItem): string {
  if (SAME_DAY_SET_AND_SUBMISSION_TYPES.has(item.type)) {
    return `${item.type}-day-${getLocalDayKey(new Date(item.createdAt))}`
  }

  switch (item.type) {
    case "comment": {
      return `comment-${item.parentType}-${item.parentId}`
    }
    case "trickSuggestion": {
      return `trickSuggestion-${item.trickId}`
    }
    case "trickVideo": {
      return `trickVideo-${item.trickId}`
    }
    case "utvVideoSuggestion": {
      return `utvVideoSuggestion-${item.videoId}`
    }
    default: {
      return `${item.type}-${item.id}`
    }
  }
}

function getGroupedSummaryLabel(items: ActivityItem[]): string | undefined {
  if (items.length < 2) {
    return undefined
  }

  const firstType = items[0]?.type
  if (!firstType || !items.every((item) => item.type === firstType)) {
    return undefined
  }

  const count = items.length

  switch (firstType) {
    case "riuSet":
      return `uploaded ${count} riu set${count === 1 ? "" : "s"}`
    case "riuSubmission":
      return `submitted ${count} riu submission${count === 1 ? "" : "s"}`
    case "biuSet":
      return `added ${count} biu set${count === 1 ? "" : "s"}`
    case "siuSet":
      return `added ${count} siu set${count === 1 ? "" : "s"}`
    case "trickSubmission":
      return `submitted ${count} trick submission${count === 1 ? "" : "s"}`
    default:
      return undefined
  }
}

function getGroupedSubItemText(
  item: ActivityItem,
  display: {
    label: string
    description?: string
  },
): {
  label: string
  description?: string
} {
  switch (item.type) {
    case "riuSet":
      return {
        label: item.name?.trim() || display.label,
        description: display.description,
      }
    case "riuSubmission":
      return {
        label: item.parentTitle?.trim() || display.label,
        description: display.description,
      }
    default:
      return display
  }
}

function groupConsecutiveItems(items: ActivityItem[]): ActivityGroup[] {
  const groups: ActivityGroup[] = []
  for (const item of items) {
    const key = getGroupKey(item)
    const last = groups.at(-1)
    if (last && last.key === key) {
      last.items.push(item)
    } else {
      groups.push({ key, items: [item] })
    }
  }
  return groups
}

const SEPARATOR_CLASS =
  "bg-border! group-data-[orientation=vertical]/timeline:-left-7 group-data-[orientation=vertical]/timeline:h-full group-data-[orientation=vertical]/timeline:translate-y-4"

const INDICATOR_CLASS =
  "flex size-6 items-center justify-center rounded-full border-none bg-muted text-muted-foreground group-data-[orientation=vertical]/timeline:-left-7 group-data-[orientation=vertical]/timeline:top-1"

const ITEM_CLASS =
  "group-data-[orientation=vertical]/timeline:ms-10 group-data-[orientation=vertical]/timeline:not-last:pb-4"

type ActivityFeedProps = {
  userId: number
}

export function ActivityFeed({ userId }: ActivityFeedProps) {
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter | "all">(
    "all",
  )
  const deferredTypeFilter = useDeferredValue(typeFilter)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      users.activity.infiniteQueryOptions({
        userId,
        type: deferredTypeFilter === "all" ? undefined : deferredTypeFilter,
      }),
    )

  const items = useMemo(() => data.pages.flatMap((p) => p.items), [data])

  const groups = useMemo(() => groupConsecutiveItems(items), [items])

  const totalSteps = groups.length + (hasNextPage ? 1 : 0)

  const filterDropdown = (
    <Select
      value={typeFilter}
      onValueChange={(v) => setTypeFilter(v as ActivityTypeFilter | "all")}
      items={ACTIVITY_ITEMS}
    >
      <SelectTrigger className="h-7 w-fit text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" label="all activity">
          all activity
        </SelectItem>
        {ACTIVITY_TYPES.map((type) => (
          <SelectItem key={type} value={type} label={TYPE_LABELS[type]}>
            {TYPE_LABELS[type]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  if (items.length === 0) {
    const isFiltered = typeFilter !== "all"
    return (
      <div className="flex flex-col gap-2">
        {isFiltered && (
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">activity</h2>
            {filterDropdown}
          </div>
        )}
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GhostIcon />
            </EmptyMedia>
            <EmptyTitle>no activity</EmptyTitle>
            <EmptyDescription>
              {isFiltered
                ? `no ${TYPE_LABELS[typeFilter].toLowerCase()} found`
                : "no activity in the past year"}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">activity</h2>
        {filterDropdown}
      </div>
      <Timeline
        defaultValue={totalSteps}
        className="group-data-[orientation=vertical]/timeline:gap-0"
      >
        {groups.map((group, index) => (
          <ActivityGroupRow
            key={group.key}
            group={group}
            step={index + 1}
            isLast={index === groups.length - 1 && !hasNextPage}
          />
        ))}

        {hasNextPage && (
          <TimelineItem
            step={totalSteps}
            className="group-data-[orientation=vertical]/timeline:ms-10 group-data-[orientation=vertical]/timeline:pb-0!"
          >
            <TimelineHeader>
              <TimelineIndicator className="bg-muted flex size-6 items-center justify-center rounded-full border-none group-data-[orientation=vertical]/timeline:-left-7">
                <div className="bg-muted-foreground/50 size-1.5 rounded-full" />
              </TimelineIndicator>
            </TimelineHeader>
            <TimelineContent>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-auto px-2 py-1 text-xs"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "loading..." : "load more"}
              </Button>
            </TimelineContent>
          </TimelineItem>
        )}
      </Timeline>
    </div>
  )
}

function ActivityGroupRow({
  group,
  step,
  isLast,
}: {
  group: ActivityGroup
  step: number
  isLast: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const first = group.items[0]
  const count = group.items.length
  const isGrouped = count > 1
  const { icon, label, description, url } = getActivityDisplay(first)
  const groupedItems = isGrouped
    ? group.items.map((item) => ({
        item,
        display: getActivityDisplay(item),
      }))
    : []
  const groupedSummaryLabel = getGroupedSummaryLabel(group.items)
  const groupedHeaderLabel = groupedSummaryLabel ?? label
  const showGroupedDescription =
    !!description &&
    !groupedItems.some(({ display }) => display.description === description)

  if (!isGrouped) {
    return (
      <TimelineItem
        step={step}
        className={cn(
          ITEM_CLASS,
          isLast && "group-data-[orientation=vertical]/timeline:pb-0!",
        )}
      >
        <TimelineHeader>
          <TimelineSeparator className={SEPARATOR_CLASS} />
          <TimelineIndicator className={INDICATOR_CLASS}>
            {icon}
          </TimelineIndicator>
        </TimelineHeader>
        <TimelineContent className="text-foreground">
          <div className="hover:bg-accent/50 relative flex min-w-0 items-center gap-2 rounded-md px-2 py-1">
            <div className="min-w-0 flex-1">
              <TimelineTitle className="truncate">
                <Link
                  to={url}
                  className="after:absolute after:inset-0 after:rounded-md"
                >
                  {label}
                </Link>
              </TimelineTitle>
              {description && (
                <p className="text-muted-foreground truncate text-xs">
                  <RichText content={description} mentionMode="plainText" />
                </p>
              )}
            </div>
            <TimelineDate className="relative z-10 mb-0 shrink-0">
              <RelativeTimeCard
                date={new Date(first.createdAt)}
                variant="muted"
              />
            </TimelineDate>
          </div>
        </TimelineContent>
      </TimelineItem>
    )
  }

  return (
    <TimelineItem
      step={step}
      className={cn(
        ITEM_CLASS,
        isLast && "group-data-[orientation=vertical]/timeline:pb-0!",
      )}
    >
      <TimelineHeader>
        <TimelineSeparator className={SEPARATOR_CLASS} />
        <TimelineIndicator className={INDICATOR_CLASS}>
          <div className="text-foreground/60">{icon}</div>
        </TimelineIndicator>
      </TimelineHeader>
      <TimelineContent className="text-foreground">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpanded(!expanded)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setExpanded(!expanded)
            }
          }}
          className="hover:bg-accent/50 relative flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left"
        >
          <div className="min-w-0 flex-1">
            <TimelineTitle className="truncate">
              {groupedHeaderLabel}
              {!groupedSummaryLabel && (
                <span className="text-muted-foreground ml-1 text-xs">
                  &times; {count}
                </span>
              )}
            </TimelineTitle>
            {showGroupedDescription && (
              <p className="text-muted-foreground truncate text-xs">
                <RichText content={description} />
              </p>
            )}
          </div>
          <span className="text-muted-foreground shrink-0">
            {expanded ? (
              <ChevronDownIcon className="size-3.5" />
            ) : (
              <ChevronRightIcon className="size-3.5" />
            )}
          </span>
          <TimelineDate className="mb-0 shrink-0">
            <RelativeTimeCard
              date={new Date(first.createdAt)}
              variant="muted"
            />
          </TimelineDate>
        </div>

        {expanded && (
          <div className="border-border ml-2 flex flex-col border-l">
            {groupedItems.map(({ item, display }) => {
              const subItemText = getGroupedSubItemText(item, display)
              const showSubItemLabel =
                subItemText.label !== groupedHeaderLabel ||
                !subItemText.description
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="hover:bg-accent/50 relative flex min-w-0 items-center gap-2 rounded-md px-4 py-1"
                >
                  <Link
                    to={display.url}
                    aria-label={subItemText.label}
                    className="absolute inset-0 rounded-md"
                  />
                  <div className="min-w-0 flex-1">
                    {showSubItemLabel && (
                      <p className="text-foreground truncate text-xs">
                        {subItemText.label}
                      </p>
                    )}
                    {subItemText.description && (
                      <p className="text-muted-foreground truncate text-xs">
                        <RichText
                          content={subItemText.description}
                          mentionMode="plainText"
                        />
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </TimelineContent>
    </TimelineItem>
  )
}

function getActivityDisplay(item: ActivityItem): {
  icon: React.ReactNode
  label: string
  description?: string
  url: string
} {
  switch (item.type) {
    case "post": {
      return {
        icon: <StickyNoteIcon className="size-2.5" />,
        label: `posted ${item.title ?? "untitled"}`,
        description: getDescriptionPreview(item.content),
        url: `/posts/${item.id}`,
      }
    }
    case "comment": {
      return {
        icon: <MessageCircleIcon className="size-2.5" />,
        label: `commented on ${item.parentTitle ?? "a post"}`,
        description: getDescriptionPreview(item.content),
        url: getParentUrl(item),
      }
    }
    case "riuSet": {
      return {
        icon: <MergeIcon className="size-2.5" />,
        label: `uploaded riu set ${item.name}`,
        description: getDescriptionPreview(item.content),
        url: `/games/rius/sets/${item.id}`,
      }
    }
    case "riuSubmission": {
      return {
        icon: <MergeIcon className="size-2.5" />,
        label: `submitted to riu set ${item.parentTitle ?? "a set"}`,
        description: getDescriptionPreview(item.content),
        url: `/games/rius/submissions/${item.id}`,
      }
    }
    case "biuSet": {
      return {
        icon: <ArrowLeftRightIcon className="size-2.5" />,
        label: `added to biu round ${item.name}`,
        url: `/games/bius/${item.biuId}`,
      }
    }
    case "trickSubmission": {
      return {
        icon: <FileTextIcon className="size-2.5" />,
        label: `submitted trick ${item.name ?? "untitled"}`,
        url: "/tricks",
      }
    }
    case "trickSuggestion": {
      return {
        icon: <EditIcon className="size-2.5" />,
        label: `suggested edit to ${item.trickName ?? "a trick"}`,
        url: item.trickSlug ? `/tricks/${item.trickSlug}` : "/tricks",
      }
    }
    case "trickVideo": {
      return {
        icon: <VideoIcon className="size-2.5" />,
        label: `submitted video for ${item.trickName ?? "a trick"}`,
        url: item.trickSlug ? `/tricks/${item.trickSlug}` : "/tricks",
      }
    }
    case "utvVideoSuggestion": {
      return {
        icon: <EditIcon className="size-2.5" />,
        label: `suggested edit to ${item.videoTitle ?? "a video"}`,
        url: item.videoId ? `/vault/${item.videoId}` : "/vault",
      }
    }
    case "siuSet": {
      return {
        icon: <StackItUpIcon className="size-2.5" />,
        label: `added to siu round ${item.name ?? ""}`,
        url: `/games/sius/${item.siuId}`,
      }
    }
    default: {
      return {
        icon: <StickyNoteIcon className="size-2.5" />,
        label: "activity",
        url: "/",
      }
    }
  }
}

function getParentUrl(item: ActivityItem): string {
  switch (item.parentType) {
    case "post": {
      return `/posts/${item.parentId}`
    }
    case "riuSet": {
      return `/games/rius/sets/${item.parentId}`
    }
    case "riuSubmission": {
      return `/games/rius/submissions/${item.parentId}`
    }
    case "biuSet": {
      return `/games/bius/sets/${item.parentId}`
    }
    default: {
      return "/"
    }
  }
}
