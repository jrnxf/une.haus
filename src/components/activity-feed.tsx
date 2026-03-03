import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import {
  ArrowLeftRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EditIcon,
  FileTextIcon,
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

const TYPE_LABELS: Record<ActivityTypeFilter, string> = {
  post: "Posts",
  comment: "Comments",
  riuSet: "RIU Sets",
  riuSubmission: "RIU Submissions",
  biuSet: "BIU Sets",
  trickSubmission: "Trick Submissions",
  trickSuggestion: "Trick Suggestions",
  trickVideo: "Trick Videos",
  utvVideoSuggestion: "Vault Suggestions",
  siuSet: "SIU Sets",
}

const ACTIVITY_ITEMS: Record<string, string> = {
  all: "All activity",
  ...TYPE_LABELS,
}

type ActivityGroup = {
  key: string
  items: ActivityItem[]
}

function getGroupKey(item: ActivityItem): string {
  switch (item.type) {
    case "comment": {
      return `comment-${item.parentType}-${item.parentId}`
    }
    case "riuSubmission": {
      return `riuSubmission-${item.riuSetId}`
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
    case "biuSet": {
      return `biuSet-${item.biuId}`
    }
    case "siuSet": {
      return `siuSet-${item.siuId}`
    }
    default: {
      return `${item.type}-${item.id}`
    }
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
      <SelectTrigger className="h-7 w-36 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" label="All activity">
          All activity
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
            <h2 className="text-sm font-medium">Activity</h2>
            {filterDropdown}
          </div>
        )}
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <StickyNoteIcon />
            </EmptyMedia>
            <EmptyTitle>no activity</EmptyTitle>
            <EmptyDescription>
              {isFiltered
                ? `no ${TYPE_LABELS[typeFilter].toLowerCase()} found.`
                : "no activity in the past year."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Activity</h2>
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

  if (!isGrouped) {
    return (
      <TimelineItem
        step={step}
        className={
          isLast
            ? "group-data-[orientation=vertical]/timeline:ms-10 group-data-[orientation=vertical]/timeline:pb-0!"
            : "group-data-[orientation=vertical]/timeline:ms-10"
        }
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
                <p className="text-muted-foreground relative z-10 truncate text-xs">
                  <RichText content={description} />
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
      className={
        isLast
          ? "group-data-[orientation=vertical]/timeline:ms-10 group-data-[orientation=vertical]/timeline:pb-0!"
          : "group-data-[orientation=vertical]/timeline:ms-10"
      }
    >
      <TimelineHeader>
        <TimelineSeparator className={SEPARATOR_CLASS} />
        <TimelineIndicator className={INDICATOR_CLASS}>
          <div className="text-foreground/60">{icon}</div>
        </TimelineIndicator>
      </TimelineHeader>
      <TimelineContent className="text-foreground">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="hover:bg-accent/50 relative flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1 text-left"
        >
          <div className="min-w-0 flex-1">
            <TimelineTitle className="truncate">
              {label}
              <span className="text-muted-foreground ml-1 text-xs">
                &times; {count}
              </span>
            </TimelineTitle>
            {description && (
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
        </button>

        {expanded && (
          <div className="border-border ml-2 flex flex-col border-l">
            {group.items.map((item) => {
              const display = getActivityDisplay(item)
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="hover:bg-accent/50 relative flex min-w-0 items-center gap-2 rounded-md px-4 py-1"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground truncate text-xs">
                      <Link
                        to={display.url}
                        className="after:absolute after:inset-0 after:rounded-md"
                      >
                        {display.label}
                      </Link>
                    </p>
                    {display.description && (
                      <p className="text-muted-foreground relative z-10 truncate text-xs">
                        <RichText content={display.description} />
                      </p>
                    )}
                  </div>
                  <span className="text-muted-foreground relative z-10 shrink-0 text-xs">
                    <RelativeTimeCard
                      date={new Date(item.createdAt)}
                      variant="muted"
                    />
                  </span>
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
  description: string
  url: string
} {
  switch (item.type) {
    case "post": {
      return {
        icon: <StickyNoteIcon className="size-2.5" />,
        label: `posted ${item.title ?? "untitled"}`,
        description: item.content?.slice(0, 100) ?? "post",
        url: `/posts/${item.id}`,
      }
    }
    case "comment": {
      return {
        icon: <MessageCircleIcon className="size-2.5" />,
        label: `commented on ${item.parentTitle ?? "a post"}`,
        description: item.content?.slice(0, 100) ?? "comment",
        url: getParentUrl(item),
      }
    }
    case "riuSet": {
      return {
        icon: <MergeIcon className="size-2.5" />,
        label: `created RIU set ${item.name}`,
        description: item.content?.slice(0, 100) ?? "run it up",
        url: `/games/rius/sets/${item.id}`,
      }
    }
    case "riuSubmission": {
      return {
        icon: <MergeIcon className="size-2.5" />,
        label: `submitted to RIU set ${item.parentTitle ?? "a set"}`,
        description: "run it up submission",
        url: `/games/rius/submissions/${item.id}`,
      }
    }
    case "biuSet": {
      return {
        icon: <ArrowLeftRightIcon className="size-2.5" />,
        label: `added to BIU round ${item.name}`,
        description: "back it up",
        url: `/games/bius/${item.biuId}`,
      }
    }
    case "trickSubmission": {
      return {
        icon: <FileTextIcon className="size-2.5" />,
        label: `submitted trick ${item.name ?? "untitled"}`,
        description: "new trick submission",
        url: "/tricks",
      }
    }
    case "trickSuggestion": {
      return {
        icon: <EditIcon className="size-2.5" />,
        label: `suggested edit to ${item.trickName ?? "a trick"}`,
        description: "trick suggestion",
        url: item.trickSlug ? `/tricks/${item.trickSlug}` : "/tricks",
      }
    }
    case "trickVideo": {
      return {
        icon: <VideoIcon className="size-2.5" />,
        label: `submitted video for ${item.trickName ?? "a trick"}`,
        description: "trick video",
        url: item.trickSlug ? `/tricks/${item.trickSlug}` : "/tricks",
      }
    }
    case "utvVideoSuggestion": {
      return {
        icon: <EditIcon className="size-2.5" />,
        label: `suggested edit to ${item.videoTitle ?? "a video"}`,
        description: "vault suggestion",
        url: item.videoId ? `/vault/${item.videoId}` : "/vault",
      }
    }
    case "siuSet": {
      return {
        icon: <StackItUpIcon className="size-2.5" />,
        label: `added to SIU round ${item.name ?? ""}`,
        description: "stack it up",
        url: `/games/sius/${item.siuId}`,
      }
    }
    default: {
      return {
        icon: <StickyNoteIcon className="size-2.5" />,
        label: "activity",
        description: "",
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
