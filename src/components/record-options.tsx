import { ChevronDownIcon } from "lucide-react"
import { useRef } from "react"

import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { useAuthGate } from "~/hooks/use-auth-gate"

export function RecordOptions({
  onDeleteRecord,
  onEditRecord,
  onLikeUnlike,
  onShowReactions,
  record,
}: {
  onDeleteRecord: () => void
  onEditRecord: () => void
  onLikeUnlike: (action: "like" | "unlike") => void
  onShowReactions: () => void
  record: {
    likes: {
      user: {
        avatarId: null | string
        id: number
        name: string
      }
    }[]
    user: {
      id: number
    }
  }
}) {
  const { sessionUser, authGate } = useAuthGate()
  const menuTriggerReference = useRef<HTMLButtonElement>(null)

  const isOwnedByAuthUser = Boolean(
    sessionUser && sessionUser.id === record.user.id,
  )

  const isLikedByAuthUser = Boolean(
    sessionUser && record.likes.some((like) => like.user.id === sessionUser.id),
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="transition-none"
          ref={menuTriggerReference}
          size="icon-sm"
          variant="ghost"
        >
          <ChevronDownIcon className="size-5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent collisionPadding={8}>
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => {
              authGate(() =>
                onLikeUnlike(isLikedByAuthUser ? "unlike" : "like"),
              )
            }}
          >
            {isLikedByAuthUser ? "unlike" : "like"}
          </DropdownMenuItem>

          {record.likes.length > 0 && (
            <DropdownMenuItem onClick={onShowReactions}>
              reactions
            </DropdownMenuItem>
          )}

          {isOwnedByAuthUser && (
            <>
              <DropdownMenuItem onClick={onEditRecord}>edit</DropdownMenuItem>
              <DropdownMenuItem
                className="focus:bg-destructive focus:text-destructive-foreground"
                onClick={onDeleteRecord}
              >
                delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
