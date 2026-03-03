import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  HeartIcon,
  MessageCircleIcon,
  PencilIcon,
  TrashIcon,
  TrendingUpIcon,
} from "lucide-react"
import pluralize from "pluralize"
import { useState } from "react"
import { z } from "zod"

import { confirm } from "~/components/confirm-dialog"
import { FlagTray } from "~/components/flag-tray"
import { CreateRiuSubmissionForm } from "~/components/forms/games/rius"
import { BaseMessageForm } from "~/components/forms/message"
import { UsersDialog } from "~/components/likes-dialog"
import { MessageAuthor } from "~/components/messages/message-author"
import { MessageBubble } from "~/components/messages/message-bubble"
import { RichText } from "~/components/rich-text"
import { ShareButton } from "~/components/share-button"
import { Button } from "~/components/ui/button"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { getMuxPoster, VideoPlayer } from "~/components/video-player"
import { games } from "~/lib/games"
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

export const Route = createFileRoute("/games/rius/sets/$setId/")({
  component: RouteComponent,
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { setId }, preload }) => {
    const ensureSet = async () => {
      try {
        const set = await context.queryClient.ensureQueryData(
          games.rius.sets.get.queryOptions({ setId }),
        )
        // Prefetch messages for the set
        await context.queryClient.ensureQueryData(
          messages.list.queryOptions({ type: "riuSet", id: setId }),
        )
        return set
      } catch {
        // Only show flash message on actual navigation, not preload
        if (!preload) {
          await session.flash.set.fn({ data: { message: "Set not found" } })
        }
        throw redirect({ to: "/games/rius" })
      }
    }

    const set = await ensureSet()
    return { set }
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
      description:
        set.instructions?.slice(0, 160) || "Rack It Up set on une.haus",
      path: `/games/rius/sets/${set.id}`,
      image,
      card: image ? "summary_large_image" : "summary",
    })
  },
})

function RouteComponent() {
  const { setId } = Route.useParams()

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
        <SetView setId={setId} />
      </div>
    </div>
  )
}

function SetView({ setId }: { setId: number }) {
  const { data: set } = useSuspenseQuery(
    games.rius.sets.get.queryOptions({ setId }),
  )

  invariant(set, "Set not found")

  const record = { type: "riuSet" as const, id: setId }
  const messagesQuery = useSuspenseQuery(messages.list.queryOptions(record))
  const createMessage = useCreateMessage(record)

  const sessionUser = useSessionUser()

  const authUserLiked = set.likes.some(
    (like) => like.userId === sessionUser?.id,
  )

  const likeUnlike = useLikeUnlikeRecord({
    record,
    authUserLiked,
    optimisticUpdateQueryKey: games.rius.sets.get.queryOptions({ setId })
      .queryKey,
  })

  const isOwner = set.user.id === sessionUser?.id

  return (
    <>
      <div className="flex items-start gap-3">
        <div className="w-full space-y-1">
          <div className="flex items-center gap-2 text-2xl leading-none font-semibold tracking-tight">
            {set.name}
          </div>
          <p className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
            <Link
              to="/users/$userId"
              params={{ userId: set.user.id }}
              className="hover:underline"
            >
              {set.user.name}
            </Link>
            <span className="opacity-25">/</span>
            <RelativeTimeCard date={set.createdAt} variant="muted" />
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
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
                users={set.likes?.map((l) => l.user) ?? []}
                title={`${set.likes?.length ?? 0} ${pluralize("Like", set.likes?.length ?? 0)}`}
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
          <ShareButton />
          {sessionUser && !isOwner && (
            <FlagTray entityType="riuSet" entityId={set.id} />
          )}
        </div>
      </div>

      {set.instructions && (
        <div className="wrap-break-word whitespace-pre-wrap">
          <RichText content={set.instructions} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {isOwner && (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="outline"
                  disabled
                  aria-label="edit"
                >
                  <PencilIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>edit</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() =>
                    confirm.open({
                      title: "delete set",
                      description:
                        "are you sure you want to delete this set? this action cannot be undone.",
                      confirmText: "delete",
                      onConfirm: () => {
                        // TODO: Implement delete set functionality
                        console.log("Delete set", set.id)
                      },
                    })
                  }
                  size="icon-sm"
                  variant="outline"
                  aria-label="delete"
                >
                  <TrashIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>delete</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {set.video?.playbackId && (
        <VideoPlayer playbackId={set.video.playbackId} />
      )}

      <CollapsibleMessages
        record={record}
        messages={messagesQuery.data.messages}
        onCreateMessage={(content) => createMessage.mutate(content)}
      />

      <div className="space-y-3">
        <h3 className="text-muted-foreground text-sm font-medium">
          submissions
        </h3>

        {!set.submissions ||
          (set.submissions.length === 0 && (
            <p className="text-muted-foreground text-sm">no submissions yet.</p>
          ))}
        {set.riu.status === "active" && !isOwner && (
          <CreateRiuSubmissionForm riuSetId={setId} />
        )}

        {set.submissions && set.submissions.length > 0 && (
          <SubmissionsList submissions={set.submissions} />
        )}
      </div>
    </>
  )
}

type SubmissionType = NonNullable<
  ServerFnReturn<typeof games.rius.sets.get.fn>
>["submissions"][number]

function SubmissionCard({ submission }: { submission: SubmissionType }) {
  return (
    <Link
      to="/games/rius/submissions/$submissionId"
      params={{ submissionId: submission.id }}
      className="block"
    >
      <Button
        variant="outline"
        className="h-auto w-full justify-between gap-6 p-4 text-left"
        asChild
      >
        <div>
          <span className="inline-flex items-center gap-1.5 truncate text-sm font-medium">
            {submission.user.name}
            <span className="text-muted-foreground font-normal">/</span>
            <span className="text-muted-foreground font-normal">
              <RelativeTimeCard date={submission.createdAt} variant="muted" />
            </span>
          </span>
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <HeartIcon className="size-3" />
              <span>{submission.likes.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircleIcon className="size-3" />
              <span>{submission.messages.length}</span>
            </div>
          </div>
        </div>
      </Button>
    </Link>
  )
}

function SubmissionsList({ submissions }: { submissions: SubmissionType[] }) {
  return (
    <div className="flex flex-col gap-2">
      {submissions.map((submission) => (
        <SubmissionCard key={submission.id} submission={submission} />
      ))}
    </div>
  )
}

type MessageType = ServerFnReturn<typeof messages.list.fn>["messages"][number]

const INITIAL_VISIBLE_COUNT = 2

function CollapsibleMessages({
  record,
  messages: messageList,
  onCreateMessage,
}: {
  record: { type: "riuSet"; id: number }
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
