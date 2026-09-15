import { Link } from "@tanstack/react-router"
import { HeartIcon } from "lucide-react"

import { Button } from "~/components/ui/button"
import { ButtonGroup } from "~/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { cn } from "~/lib/utils"

type User = {
  id: number
  name: string
  avatarId: string | null
}

export function LikesButtonGroup({
  users,
  authUserLiked = false,
  onLikeUnlike,
}: {
  users: User[]
  authUserLiked?: boolean
  onLikeUnlike?: () => void
}) {
  const likeButtonLabel = authUserLiked ? "unlike" : "like"

  if (!onLikeUnlike && users.length === 0) {
    return null
  }

  const likesDropdown =
    users.length > 0 ? (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
          {users.length} {users.length === 1 ? "like" : "likes"}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-w-xs">
          {users.map((user) => (
            <DropdownMenuItem
              key={user.id}
              render={
                <Link to="/users/$userId" params={{ userId: user.id }}>
                  {user.name}
                </Link>
              }
            />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null

  const likeButton = onLikeUnlike ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon-sm"
          variant="outline"
          onClick={onLikeUnlike}
          aria-label={likeButtonLabel}
        >
          <HeartIcon
            className={cn(
              "size-4",
              authUserLiked && "fill-red-700/50 stroke-red-700",
            )}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{likeButtonLabel}</TooltipContent>
    </Tooltip>
  ) : null

  return (
    <ButtonGroup>
      {likeButton}
      {likesDropdown}
    </ButtonGroup>
  )
}
