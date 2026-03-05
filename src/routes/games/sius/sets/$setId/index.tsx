import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  HeartIcon,
  InfoIcon,
  TrashIcon,
  TrendingUpIcon,
} from "lucide-react"
import pluralize from "pluralize"
import { useState } from "react"
import { z } from "zod"

import { confirm } from "~/components/confirm-dialog"
import { BaseMessageForm } from "~/components/forms/message"
import { TrickLine } from "~/components/games/sius/trick-line"
import { UsersDialog } from "~/components/likes-dialog"
import { MessageAuthor } from "~/components/messages/message-author"
import { MessageBubble } from "~/components/messages/message-bubble"
import { ShareFlagMenu } from "~/components/share-flag-menu"
import { Tray, TrayContent, TrayTitle, TrayTrigger } from "~/components/tray"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { Metaline } from "~/components/ui/metaline"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { getMuxPoster, VideoPlayer } from "~/components/video-player"
import { games } from "~/lib/games"
import { useDeleteSet } from "~/lib/games/sius/hooks"
import { invariant } from "~/lib/invariant"
import { messages } from "~/lib/messages"
import { useCreateMessage } from "~/lib/messages/hooks"
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks"
import { seo } from "~/lib/seo"
import { useSessionUser } from "~/lib/session/hooks"
import { session } from "~/lib/session/index"
import { type ServerFnReturn } from "~/lib/types"
import { cn } from "~/lib/utils"

const pathParametersSchema = z.object({
  setId: z.coerce.number(),
})

export const Route = createFileRoute("/games/sius/sets/$setId/")({
  component: RouteComponent,
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { setId }, preload }) => {
    try {
      const set = await context.queryClient.ensureQueryData(
        games.sius.sets.get.queryOptions({ setId }),
      )
      await context.queryClient.ensureQueryData(
        messages.list.queryOptions({ type: "siuSet", id: setId }),
      )
      await context.queryClient.ensureQueryData(
        games.sius.sets.line.queryOptions({ setId }),
      )
      return { set }
    } catch {
      // Only show flash message on actual navigation, not preload
      if (!preload) {
        await session.flash.set.fn({
          data: { type: "error", message: "set not found" },
        })
      }
      throw redirect({ to: "/games/sius" })
    }
  },
  head: ({ loaderData }) => {
    const set = loaderData?.set
    if (!set) return {}

    const image = getMuxPoster({
      playbackId: set.video?.playbackId,
      width: 1200,
    })

    return seo({
      title: set.name,
      description: "Stack It Up set on une.haus",
      path: `/games/sius/sets/${set.id}`,
      image,
      card: image ? "summary_large_image" : "summary",
    })
  },
})

function RouteComponent() {
  const { setId } = Route.useParams()

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4">
      <SetView setId={setId} />
    </div>
  )
}

function SetView({ setId }: { setId: number }) {
  const { data: set } = useSuspenseQuery(
    games.sius.sets.get.queryOptions({ setId }),
  )
  const { data: line } = useSuspenseQuery(
    games.sius.sets.line.queryOptions({ setId }),
  )

  invariant(set, "Set not found")

  const record = { type: "siuSet" as const, id: setId }
  const messagesQuery = useSuspenseQuery(messages.list.queryOptions(record))
  const createMessage = useCreateMessage(record)
  const deleteSet = useDeleteSet()
  const sessionUser = useSessionUser()
  const isOwner = set.user.id === sessionUser?.id
  const isDeleted = !!set.deletedAt

  // Deleted set: show minimal placeholder
  if (isDeleted) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-muted-foreground text-2xl font-semibold">
              this set was deleted
            </h1>
            <Metaline
              parts={[
                `#${set.position}`,
                <RelativeTimeCard
                  key="created-at"
                  date={set.createdAt}
                  variant="muted"
                />,
              ]}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {set.childSet && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    asChild
                    aria-label="next set"
                  >
                    <Link
                      to="/games/sius/sets/$setId"
                      params={{ setId: set.childSet.id }}
                    >
                      <ArrowUpIcon className="size-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>next</TooltipContent>
              </Tooltip>
            )}
            {set.parentSet && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    asChild
                    aria-label="previous set"
                  >
                    <Link
                      to="/games/sius/sets/$setId"
                      params={{ setId: set.parentSet.id }}
                    >
                      <ArrowDownIcon className="size-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>previous</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    )
  }

  const isLatest = set.isLatest
  const landedTricks = line.toReversed()

  // Can add set if: user logged in, round active, not own set, is latest
  const canAddSet =
    sessionUser && set.siu.status === "active" && !isOwner && isLatest

  // Can delete if: owner and not already deleted
  const canDelete = isOwner

  const authUserLiked = set.likes.some(
    (like: { user: { id: number } }) => like.user.id === sessionUser?.id,
  )

  const likeUnlike = useLikeUnlikeRecord({
    record,
    authUserLiked,
    optimisticUpdateQueryKey: games.sius.sets.get.queryOptions({ setId })
      .queryKey,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{set.name}</h1>
            {isLatest && (
              <Badge variant="outline" className="text-xs">
                latest
              </Badge>
            )}
          </div>
          <Metaline
            parts={[
              <Link
                key="author"
                to="/users/$userId"
                params={{ userId: set.user.id }}
                className="hover:underline"
              >
                {set.user.name}
              </Link>,
              `#${set.position}`,
              <RelativeTimeCard
                key="created-at"
                date={set.createdAt}
                variant="muted"
              />,
            ]}
          />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {set.childSet && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="outline"
                  asChild
                  aria-label="next set"
                >
                  <Link
                    to="/games/sius/sets/$setId"
                    params={{ setId: set.childSet.id }}
                  >
                    <ArrowUpIcon className="size-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>next</TooltipContent>
            </Tooltip>
          )}
          {set.parentSet && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="outline"
                  asChild
                  aria-label="previous set"
                >
                  <Link
                    to="/games/sius/sets/$setId"
                    params={{ setId: set.parentSet.id }}
                  >
                    <ArrowDownIcon className="size-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>previous</TooltipContent>
            </Tooltip>
          )}
          {landedTricks.length > 0 && (
            <Tray>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TrayTrigger asChild>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      aria-label="stack info"
                    >
                      <InfoIcon className="size-4" />
                    </Button>
                  </TrayTrigger>
                </TooltipTrigger>
                <TooltipContent>stack info</TooltipContent>
              </Tooltip>
              <TrayContent className="space-y-3" dialogClassName="max-w-2xl">
                <TrayTitle>stack info</TrayTitle>
                <Card>
                  <CardContent>
                    <TrickLine tricks={landedTricks} />
                  </CardContent>
                </Card>
              </TrayContent>
            </Tray>
          )}
          {sessionUser && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={likeUnlike.mutate}
                  aria-label={authUserLiked ? "Unlike" : "Like"}
                >
                  <HeartIcon
                    className={cn(
                      "size-4",
                      authUserLiked && "fill-red-700/50 stroke-red-700",
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {authUserLiked ? "unlike" : "like"}
              </TooltipContent>
            </Tooltip>
          )}
          {set.likes.length > 0 && (
            <Tooltip>
              <UsersDialog
                users={set.likes.map(
                  (l: {
                    user: { id: number; name: string; avatarId: string | null }
                  }) => l.user,
                )}
                title={`${set.likes.length} ${pluralize("Like", set.likes.length)}`}
                trigger={
                  <TooltipTrigger asChild>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      aria-label="view likes"
                    >
                      <TrendingUpIcon className="size-4" />
                    </Button>
                  </TooltipTrigger>
                }
              />
              <TooltipContent>likes</TooltipContent>
            </Tooltip>
          )}
          <ShareFlagMenu
            entityType="siuSet"
            entityId={set.id}
            canFlag={Boolean(sessionUser && !isOwner)}
          />
          {canDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="outline"
                  aria-label="delete set"
                  onClick={() =>
                    confirm.open({
                      title: "delete set",
                      description:
                        "are you sure you want to delete this set? this action cannot be undone.",
                      confirmText: "delete",
                      onConfirm: () => {
                        deleteSet.mutate({ data: { setId: set.id } })
                      },
                    })
                  }
                >
                  <TrashIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>delete</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Video */}
      {set.video?.playbackId && (
        <VideoPlayer playbackId={set.video.playbackId} />
      )}

      {/* Actions */}
      {canAddSet && (
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/games/sius/$siuId/upload" params={{ siuId: set.siu.id }}>
              upload
            </Link>
          </Button>
        </div>
      )}

      {/* Messages */}
      <CollapsibleMessages
        record={record}
        messages={messagesQuery.data.messages}
        onCreateMessage={(content) => createMessage.mutate(content)}
      />
    </div>
  )
}

type MessageType = ServerFnReturn<typeof messages.list.fn>["messages"][number]

const INITIAL_VISIBLE_COUNT = 3

function CollapsibleMessages({
  record,
  messages: messageList,
  onCreateMessage,
}: {
  record: { type: "siuSet"; id: number }
  messages: MessageType[]
  onCreateMessage: (content: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const sessionUser = useSessionUser()

  const hasMoreMessages = messageList.length > INITIAL_VISIBLE_COUNT
  const visibleMessages = isExpanded
    ? messageList
    : messageList.slice(-INITIAL_VISIBLE_COUNT)
  const hiddenCount = messageList.length - INITIAL_VISIBLE_COUNT

  return (
    <div className="space-y-3">
      {messageList.length > 0 && (
        <>
          <div className="flex items-center justify-end">
            {hasMoreMessages && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-1 text-xs"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <>
                    Show less
                    <ChevronUpIcon className="size-3" />
                  </>
                ) : (
                  <>
                    Show {hiddenCount} more
                    <ChevronDownIcon className="size-3" />
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {visibleMessages.map((message, index) => {
              const isAuthUserMessage = Boolean(
                sessionUser && sessionUser.id === message.user.id,
              )
              const prevMessage = visibleMessages[index - 1]
              const isNewSection = prevMessage?.user.id !== message.user.id

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex max-w-full flex-col",
                    isAuthUserMessage && "items-end",
                  )}
                >
                  {isNewSection && (
                    <div className={cn("mb-1", index !== 0 && "mt-4")}>
                      <MessageAuthor message={message} />
                    </div>
                  )}
                  <MessageBubble parent={record} message={message} />
                </div>
              )
            })}
          </div>
        </>
      )}

      <BaseMessageForm onSubmit={onCreateMessage} />
    </div>
  )
}
