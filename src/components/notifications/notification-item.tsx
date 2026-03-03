import {
  AtSignIcon,
  Check,
  Flag,
  Heart,
  MessageCircle,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react"

import { type NotificationType } from "~/db/schema"

export function NotificationIcon({
  type,
  entityTitle,
}: {
  type: NotificationType
  entityTitle?: string
}) {
  switch (type) {
    case "like": {
      return <Heart className="size-3" />
    }
    case "comment": {
      return <MessageCircle className="size-3" />
    }
    case "follow": {
      return <UserPlus className="size-3" />
    }
    case "new_content": {
      return <Sparkles className="size-3" />
    }
    case "review": {
      if (entityTitle === "rejected") {
        return <X className="size-3" />
      }
      return <Check className="size-3" />
    }
    case "flag": {
      return <Flag className="size-3" />
    }
    case "mention": {
      return <AtSignIcon className="size-3" />
    }
    default: {
      return <Sparkles className="size-3" />
    }
  }
}

export function formatActorNames(names: string[], count: number): string {
  if (names.length === 0) return ""
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  const remaining = count - names.length
  if (remaining > 0) {
    return `${names[0]}, ${names[1]} and ${remaining} other${remaining > 1 ? "s" : ""}`
  }
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
}
