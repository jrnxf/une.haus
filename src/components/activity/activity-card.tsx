import { Link } from "@tanstack/react-router"
import { ArrowDownToLineIcon, LayersIcon, PaperclipIcon } from "lucide-react"

import { RichText } from "~/components/rich-text"
import { Badge } from "~/components/ui/badge"
import { buttonVariants } from "~/components/ui/button"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import { type ActivityItem } from "~/lib/users"
import { cn } from "~/lib/utils"

type ActivityCardProps = {
  item: ActivityItem
}

export function ActivityCard({ item }: ActivityCardProps) {
  // Render posts exactly like /posts view
  if (item.type === "post") {
    return <PostCard item={item} />
  }

  const display = getCardDisplay(item)

  return (
    <div className="group relative">
      <div
        className={cn(
          "bg-card rounded-lg border p-4 transition-all",
          "hover:border-primary/30 hover:shadow-sm",
          "active:scale-[0.99]",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-muted flex size-6 items-center justify-center rounded-full">
              {display.icon}
            </div>
            <Badge variant="secondary" className="text-xs">
              {display.typeLabel}
            </Badge>
          </div>
          <span className="text-muted-foreground shrink-0 text-xs">
            <RelativeTimeCard date={new Date(item.createdAt)} variant="muted" />
          </span>
        </div>

        <div className="mt-3">
          <Link
            to={display.url}
            className="group-hover:text-primary text-sm font-medium after:absolute after:inset-0 after:rounded-lg"
          >
            {display.title}
          </Link>
          {display.description && (
            <div className="text-muted-foreground mt-1 line-clamp-2 text-sm">
              <RichText content={display.description} mentionMode="plainText" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PostCard({ item }: { item: ActivityItem }) {
  const hasMedia = Boolean(item.imageId)

  return (
    <div className="relative">
      <div
        className={cn(
          buttonVariants({ variant: "card" }),
          "flex flex-col gap-4 p-3 sm:flex-row",
        )}
      >
        <div className="flex w-full flex-col gap-2">
          <Link
            params={{ postId: item.id }}
            to="/posts/$postId"
            className="truncate font-semibold after:absolute after:inset-0 after:rounded-md"
          >
            {hasMedia && (
              <PaperclipIcon className="text-muted-foreground mr-2 inline size-3" />
            )}
            {item.title ?? "Untitled"}
          </Link>
          {item.content && (
            <div className="line-clamp-3 text-sm">
              <RichText content={item.content} mentionMode="plainText" />
            </div>
          )}
          <div className="flex w-full justify-between gap-4">
            <p className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
              <RelativeTimeCard
                date={new Date(item.createdAt)}
                variant="muted"
              />
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

type CardDisplay = {
  icon: React.ReactNode
  typeLabel: string
  title: string
  description?: string
  url: string
}

function getCardDisplay(item: ActivityItem): CardDisplay {
  switch (item.type) {
    case "riuSet": {
      return {
        icon: <LayersIcon className="size-3" />,
        typeLabel: "RIU set",
        title: item.name ?? "untitled set",
        description: item.content?.slice(0, 150),
        url: `/games/rius/sets/${item.id}`,
      }
    }
    case "riuSubmission": {
      return {
        icon: <ArrowDownToLineIcon className="size-3" />,
        typeLabel: "RIU submission",
        title: `submitted to: ${item.parentTitle ?? "a set"}`,
        url: `/games/rius/submissions/${item.id}`,
      }
    }
    case "biuSet": {
      return {
        icon: <LayersIcon className="size-3" />,
        typeLabel: "BIU",
        title: "added to round",
        url: `/games/bius/${item.biuId}`,
      }
    }
    case "siuSet": {
      return {
        icon: <LayersIcon className="size-3" />,
        typeLabel: "SIU",
        title: item.name ?? "added to round",
        url: `/games/sius/${item.siuId}`,
      }
    }
    default: {
      return {
        icon: <LayersIcon className="size-3" />,
        typeLabel: "activity",
        title: "activity",
        url: "/",
      }
    }
  }
}
