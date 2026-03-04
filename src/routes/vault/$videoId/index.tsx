import { useSuspenseQueries } from "@tanstack/react-query"
import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { HeartIcon, PencilIcon, TrendingUpIcon } from "lucide-react"
import pluralize from "pluralize"
import { z } from "zod"

import { DisciplineBadge } from "~/components/badges"
import { UsersDialog } from "~/components/likes-dialog"
import { PageHeader } from "~/components/page-header"
import { ShareButton } from "~/components/share-button"
import { Button } from "~/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { UserChip } from "~/components/user-chip"
import { getMuxPoster, VideoPlayer } from "~/components/video-player"
import { type UserDiscipline } from "~/db/schema"
import { invariant } from "~/lib/invariant"
import { messages } from "~/lib/messages"
import { useCreateMessage } from "~/lib/messages/hooks"
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks"
import { seo } from "~/lib/seo"
import { useIsAdmin, useSessionUser } from "~/lib/session/hooks"
import { session } from "~/lib/session/index"
import { cn } from "~/lib/utils"
import { utv } from "~/lib/utv/core"
import { MessagesView } from "~/views/messages"

const pathParametersSchema = z.object({
  videoId: z.coerce.number(),
})

export const Route = createFileRoute("/vault/$videoId/")({
  component: RouteComponent,
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { videoId }, preload }) => {
    const ensureVideo = async () => {
      try {
        return await context.queryClient.ensureQueryData(
          utv.get.queryOptions(videoId),
        )
      } catch {
        // Only show flash message on actual navigation, not preload
        if (!preload) {
          await session.flash.set.fn({
            data: { type: "error", message: "video not found" },
          })
        }
        throw redirect({ to: "/vault" })
      }
    }

    const ensureMessages = async () => {
      await context.queryClient.ensureQueryData(
        messages.list.queryOptions({
          id: videoId,
          type: "utvVideo",
        }),
      )
    }

    const [video] = await Promise.all([ensureVideo(), ensureMessages()])
    return { video }
  },
  head: ({ loaderData }) => {
    const video = loaderData?.video
    if (!video) return {}

    const displayTitle = video.title || video.legacyTitle
    const riderNames = video.riders
      .map((r) => r.user?.name || r.name)
      .join(", ")
    const disciplines = video.disciplines?.join(", ")
    const descParts = [riderNames, disciplines].filter(Boolean)
    const description =
      descParts.length > 0 ? descParts.join(" — ") : "Video on une.haus"

    return seo({
      title: displayTitle || "Video",
      description,
      path: `/vault/${video.id}`,
      image: getMuxPoster({ playbackId: video.video?.playbackId, width: 1200 }),
      card: "summary_large_image",
      type: "video.other",
    })
  },
})

function RouteComponent() {
  const { videoId } = Route.useParams()

  const [{ data: video }, { data: messagesData }] = useSuspenseQueries({
    queries: [
      utv.get.queryOptions(videoId),
      messages.list.queryOptions({
        id: videoId,
        type: "utvVideo",
      }),
    ],
  })

  invariant(video, "Video not found")

  const sessionUser = useSessionUser()
  const isAdmin = useIsAdmin()

  const { mutate: createMessage } = useCreateMessage({
    id: videoId,
    type: "utvVideo",
  })

  const authUserLiked = Boolean(
    sessionUser && video.likes.some((like) => like.user.id === sessionUser.id),
  )

  const { mutate: likeUnlikeVideo } = useLikeUnlikeRecord({
    authUserLiked,
    record: { id: videoId, type: "utvVideo" },
    optimisticUpdateQueryKey: utv.get.queryOptions(videoId).queryKey,
  })

  const displayTitle = video.title || video.legacyTitle

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/vault">vault</PageHeader.Crumb>
          <PageHeader.Crumb>{displayTitle}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="h-full min-h-0 overflow-y-auto">
        <div className="mx-auto flex h-auto w-full max-w-5xl flex-col justify-start gap-6 p-4">
          <div className="flex items-center gap-2">
            <h1 className="flex-1 text-2xl leading-none font-semibold tracking-tight">
              {displayTitle}
            </h1>
            <div className="flex shrink-0 items-center gap-1">
              {sessionUser && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      onClick={likeUnlikeVideo}
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
              {video.likes.length > 0 && (
                <Tooltip>
                  <UsersDialog
                    users={video.likes.map((like) => like.user)}
                    title={`${video.likes.length} ${pluralize("Like", video.likes.length)}`}
                    trigger={
                      <TooltipTrigger asChild>
                        <Button size="icon-sm" variant="outline">
                          <TrendingUpIcon className="size-4" />
                        </Button>
                      </TooltipTrigger>
                    }
                  />
                  <TooltipContent>likes</TooltipContent>
                </Tooltip>
              )}
              <ShareButton />
              {sessionUser && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon-sm" asChild>
                      <Link
                        to={
                          isAdmin
                            ? "/vault/$videoId/edit"
                            : "/vault/$videoId/suggest"
                        }
                        params={{ videoId }}
                      >
                        <PencilIcon className="size-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>edit</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Disciplines */}
          {video.disciplines && video.disciplines.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {video.disciplines.map((discipline) => (
                <DisciplineBadge
                  key={discipline}
                  discipline={discipline as UserDiscipline}
                />
              ))}
            </div>
          )}

          {/* Riders */}
          {video.riders.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {video.riders.map((rider) => {
                if (rider.user) {
                  return <UserChip key={rider.id} user={rider.user} />
                }
                return (
                  <span
                    key={rider.id}
                    className="bg-muted rounded-full px-2 py-1 text-sm"
                  >
                    {rider.name}
                  </span>
                )
              })}
            </div>
          )}

          {video.video?.playbackId && (
            <VideoPlayer playbackId={video.video.playbackId} />
          )}

          <div className="shrink-0">
            <MessagesView
              record={{ id: videoId, type: "utvVideo" }}
              messages={messagesData.messages}
              handleCreateMessage={createMessage}
              scrollTargetId="main-content"
            />
          </div>
        </div>
      </div>
    </>
  )
}
