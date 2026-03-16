import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from "lucide-react"
import { z } from "zod"

import { confirm } from "~/components/confirm-dialog"
import { LikesButtonGroup } from "~/components/likes-button-group"
import { ShareFlagMenu } from "~/components/share-flag-menu"
import { Button } from "~/components/ui/button"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { getMuxPoster, VideoPlayer } from "~/components/video-player"
import { games } from "~/lib/games"
import { useDeleteSet } from "~/lib/games/bius/hooks"
import { invariant } from "~/lib/invariant"
import { messages } from "~/lib/messages"
import { useCreateMessage } from "~/lib/messages/hooks"
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks"
import { seo } from "~/lib/seo"
import { useSessionUser } from "~/lib/session/hooks"
import { session } from "~/lib/session/index"
import { CollapsibleMessages } from "~/views/collapsible-messages"
import { DetailHeader } from "~/views/detail-header"

const pathParametersSchema = z.object({
  setId: z.coerce.number(),
})

export const Route = createFileRoute("/games/bius/sets/$setId/")({
  component: RouteComponent,
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { setId }, preload }) => {
    try {
      const set = await context.queryClient.ensureQueryData(
        games.bius.sets.get.queryOptions({ setId }),
      )
      await context.queryClient.ensureQueryData(
        messages.list.queryOptions({ type: "biuSet", id: setId }),
      )
      return { set }
    } catch {
      // Only show flash message on actual navigation, not preload
      if (!preload) {
        await session.flash.set.fn({
          data: { type: "error", message: "set not found" },
        })
      }
      throw redirect({ to: "/games/bius" })
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
      description: "Back It Up set on une.haus",
      path: `/games/bius/sets/${set.id}`,
      image,
      card: image ? "summary_large_image" : "summary",
    })
  },
})

function RouteComponent() {
  const { setId } = Route.useParams()

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4">
      <SetView setId={setId} />
    </div>
  )
}

function SetView({ setId }: { setId: number }) {
  const { data: set } = useSuspenseQuery(
    games.bius.sets.get.queryOptions({ setId }),
  )

  invariant(set, "Set not found")

  const record = { type: "biuSet" as const, id: setId }
  const messagesQuery = useSuspenseQuery(messages.list.queryOptions(record))
  const createMessage = useCreateMessage(record)
  const deleteSet = useDeleteSet(set.biu.id)
  const sessionUser = useSessionUser()
  const isOwner = set.user.id === sessionUser?.id
  const isDeleted = Boolean(set.deletedAt)

  // Deleted set: show minimal placeholder with chain navigation
  if (isDeleted) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-muted-foreground text-2xl font-semibold">
              this set was deleted
            </h1>
            <p className="text-muted-foreground text-sm">
              #{set.position} in chain
            </p>
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
                      to="/games/bius/sets/$setId"
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
                      to="/games/bius/sets/$setId"
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

  // Can back up if: user logged in, not own set, is latest
  const canBackUp = sessionUser && !isOwner && isLatest

  // Can delete if: owner and not already deleted
  const canDelete = isOwner

  const authUserLiked = set.likes.some(
    (like: { user: { id: number } }) => like.user.id === sessionUser?.id,
  )

  const likeUnlike = useLikeUnlikeRecord({
    record,
    authUserLiked,
    optimisticUpdateQueryKey: games.bius.sets.get.queryOptions({ setId })
      .queryKey,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <DetailHeader>
        <DetailHeader.Title
          meta={[
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
              key="time"
              date={set.createdAt}
              variant="muted"
            />,
          ]}
        >
          {set.name}
        </DetailHeader.Title>
        <DetailHeader.Actions>
          {/* Chain navigation */}
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
                    to="/games/bius/sets/$setId"
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
                    to="/games/bius/sets/$setId"
                    params={{ setId: set.parentSet.id }}
                  >
                    <ArrowDownIcon className="size-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>previous</TooltipContent>
            </Tooltip>
          )}

          <LikesButtonGroup
            users={set.likes.map(
              (l: {
                user: { id: number; name: string; avatarId: string | null }
              }) => l.user,
            )}
            authUserLiked={authUserLiked}
            onLikeUnlike={sessionUser ? likeUnlike.mutate : undefined}
          />
          <ShareFlagMenu
            entityType="biuSet"
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
        </DetailHeader.Actions>
      </DetailHeader>

      {/* Parent set reference */}
      {set.parentSet && (
        <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <span>backed up</span>
          <Link
            to="/games/bius/sets/$setId"
            params={{ setId: set.parentSet.id }}
            className="text-foreground hover:underline"
          >
            {set.parentSet.name}
          </Link>
          {set.parentSet.user && (
            <span>
              by{" "}
              <Link
                to="/users/$userId"
                params={{ userId: set.parentSet.user.id }}
                className="hover:underline"
              >
                {set.parentSet.user.name}
              </Link>
            </span>
          )}
        </div>
      )}

      {/* Video */}
      {set.video?.playbackId && (
        <VideoPlayer playbackId={set.video.playbackId} />
      )}

      {/* Actions */}
      {canBackUp && (
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/games/bius/$biuId/upload" params={{ biuId: set.biu.id }}>
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
