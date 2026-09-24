import {
  ArrowLeftRightIcon,
  AtSignIcon,
  Check,
  EditIcon,
  FileTextIcon,
  Flag,
  Heart,
  MergeIcon,
  MessageCircle,
  StickyNoteIcon,
  UserPlus,
  VideoIcon,
  X,
} from "lucide-react"

import { StackItUpIcon } from "~/components/icons/stack-it-up-icon"
import { type NotificationEntityType, type NotificationType } from "~/db/schema"

function ContentIcon({ entityType }: { entityType?: NotificationEntityType }) {
  switch (entityType) {
    case "post": {
      return <StickyNoteIcon className="size-3" />
    }
    case "riuSet":
    case "riuSubmission": {
      return <MergeIcon className="size-3" />
    }
    case "biuSet": {
      return <ArrowLeftRightIcon className="size-3" />
    }
    case "siuSet": {
      return <StackItUpIcon className="size-3" />
    }
    case "trickSubmission": {
      return <FileTextIcon className="size-3" />
    }
    case "trickVideo": {
      return <VideoIcon className="size-3" />
    }
    case "utvVideoSuggestion": {
      return <EditIcon className="size-3" />
    }
    default: {
      return <StickyNoteIcon className="size-3" />
    }
  }
}

export function NotificationIcon({
  type,
  entityType,
  entityTitle,
}: {
  type: NotificationType
  entityType?: NotificationEntityType
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
      return <ContentIcon entityType={entityType} />
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
      return <ContentIcon entityType={entityType} />
    }
  }
}
