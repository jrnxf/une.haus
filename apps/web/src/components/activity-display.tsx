import {
  ArrowLeftRightIcon,
  EditIcon,
  FileTextIcon,
  MergeIcon,
  MessageCircleIcon,
  StickyNoteIcon,
  VideoIcon,
} from "lucide-react"

import { StackItUpIcon } from "~/components/icons/stack-it-up-icon"
import { type ActivityItem } from "~/lib/users"

function getDescriptionPreview(content?: string | null): string | undefined {
  const trimmed = content?.trim()
  if (!trimmed) {
    return undefined
  }
  return trimmed.slice(0, 100)
}

export function getActivityDisplay(item: ActivityItem): {
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
        url: item.trickId ? `/tricks/${item.trickId}` : "/tricks",
      }
    }
    case "trickVideo": {
      return {
        icon: <VideoIcon className="size-2.5" />,
        label: `submitted video for ${item.trickName ?? "a trick"}`,
        url: item.trickId ? `/tricks/${item.trickId}` : "/tricks",
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
