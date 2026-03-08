import { Link } from "@tanstack/react-router"
import { ChevronDownIcon, HeartIcon } from "lucide-react"
import pluralize from "pluralize"

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
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
  disabledLikeReason,
}: {
  users: User[]
  authUserLiked?: boolean
  onLikeUnlike?: () => void
  disabledLikeReason?: string
}) {
  const canLikeUnlike = Boolean(onLikeUnlike)
  const likeButtonLabel = authUserLiked ? "unlike" : "like"
  const likeTooltipLabel = disabledLikeReason ?? likeButtonLabel

  if (!canLikeUnlike && !disabledLikeReason && users.length === 0) {
    return null
  }

  const likeButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        {disabledLikeReason ? (
          <span className="inline-flex">
            <Button
              size="icon-sm"
              variant="outline"
              disabled
              aria-label={likeButtonLabel}
            >
              <HeartIcon
                className={cn(
                  "size-4",
                  authUserLiked && "fill-red-700/50 stroke-red-700",
                )}
              />
            </Button>
          </span>
        ) : (
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
        )}
      </TooltipTrigger>
      <TooltipContent>{likeTooltipLabel}</TooltipContent>
    </Tooltip>
  )

  const likesDropdown =
    users.length > 0 ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon-sm"
            variant="outline"
            // for some reason when the dropdown opens it loses its right rounded-ness. presumably buttons inside the buttongroup conflicting with buttongroup styles?
            className="rounded-r-md!"
            aria-label={`view ${users.length} ${pluralize("like", users.length)}`}
          >
            <ChevronDownIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-w-xs">
          {users.map((user) => (
            <DropdownMenuItem key={user.id} asChild>
              <Link
                to="/users/$userId"
                params={{ userId: user.id }}
                className="flex items-center gap-2"
              >
                <Avatar
                  className="size-6"
                  cloudflareId={user.avatarId}
                  alt={user.name}
                >
                  <AvatarImage width={48} quality={85} />
                  <AvatarFallback className="text-xs" name={user.name} />
                </Avatar>
                <span>{user.name}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null

  if ((canLikeUnlike || disabledLikeReason) && users.length > 0) {
    if (disabledLikeReason) {
      return (
        <div className="flex items-center gap-1">
          {likeButton}
          {likesDropdown}
        </div>
      )
    }

    return (
      <ButtonGroup>
        {likeButton}
        {likesDropdown}
      </ButtonGroup>
    )
  }

  if (canLikeUnlike || disabledLikeReason) {
    return likeButton
  }

  return likesDropdown
}
