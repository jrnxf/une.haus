import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { HeartIcon, TrashIcon, TrendingUpIcon } from "lucide-react"
import pluralize from "pluralize"
import { z } from "zod"

import { confirm } from "~/components/confirm-dialog"
import { FlagTray } from "~/components/flag-tray"
import { UsersDialog } from "~/components/likes-dialog"
import { ShareButton } from "~/components/share-button"
import { Button } from "~/components/ui/button"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import { Separator } from "~/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { getMuxPoster, VideoPlayer } from "~/components/video-player"
import { games } from "~/lib/games"
import { useDeleteSubmission } from "~/lib/games/rius/hooks"
import { invariant } from "~/lib/invariant"
import { messages } from "~/lib/messages"
import { useCreateMessage } from "~/lib/messages/hooks"
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks"
import { seo } from "~/lib/seo"
import { useSessionUser } from "~/lib/session/hooks"
import { session } from "~/lib/session/index"
import { cn } from "~/lib/utils"
import { MessagesView } from "~/views/messages"

const pathParametersSchema = z.object({
  submissionId: z.coerce.number(),
})

export const Route = createFileRoute("/games/rius/submissions/$submissionId/")({
  component: RouteComponent,
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { submissionId }, preload }) => {
    const ensureSubmission = async () => {
      try {
        const submission = await context.queryClient.ensureQueryData(
          games.rius.submissions.get.queryOptions({ submissionId }),
        )
        await context.queryClient.ensureQueryData(
          messages.list.queryOptions({
            type: "riuSubmission",
            id: submissionId,
          }),
        )
        return submission
      } catch {
        // Only show flash message on actual navigation, not preload
        if (!preload) {
          await session.flash.set.fn({
            data: { type: "error", message: "submission not found" },
          })
        }
        throw redirect({ to: "/games/rius/active" })
      }
    }

    const submission = await ensureSubmission()
    return { submission }
  },
  head: ({ loaderData }) => {
    const submission = loaderData?.submission
    if (!submission) return {}

    const image = getMuxPoster({
      playbackId: submission.video?.playbackId,
      width: 1200,
    })

    return seo({
      title: submission.user.name,
      description: `Rack It Up submission for ${submission.riuSet.name}`,
      path: `/games/rius/submissions/${submission.id}`,
      image,
      card: image ? "summary_large_image" : "summary",
    })
  },
})

function RouteComponent() {
  const { submissionId } = Route.useParams()

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4">
        <SubmissionView submissionId={submissionId} />
      </div>
    </div>
  )
}

function SubmissionView({ submissionId }: { submissionId: number }) {
  const { data: submission } = useSuspenseQuery(
    games.rius.submissions.get.queryOptions({ submissionId }),
  )

  invariant(submission, "Submission not found")

  const record = { type: "riuSubmission" as const, id: submissionId }
  const messagesQuery = useSuspenseQuery(messages.list.queryOptions(record))
  const createMessage = useCreateMessage(record)

  const sessionUser = useSessionUser()

  const authUserLiked = submission.likes.some(
    (like) => like.userId === sessionUser?.id,
  )

  const likeUnlike = useLikeUnlikeRecord({
    record,
    authUserLiked,
    optimisticUpdateQueryKey: games.rius.submissions.get.queryOptions({
      submissionId,
    }).queryKey,
  })

  const deleteSubmission = useDeleteSubmission({ setId: submission.riuSet.id })

  const isOwner = submission.user.id === sessionUser?.id

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="shrink-0 space-y-1">
          <Link
            to="/users/$userId"
            params={{ userId: submission.user.id }}
            className="text-2xl leading-none font-semibold tracking-tight hover:underline"
          >
            {submission.user.name}
          </Link>
          <p className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
            <RelativeTimeCard date={submission.createdAt} variant="muted" />
          </p>
        </div>

        <div className="flex shrink-0 grow items-center justify-end gap-1">
          {isOwner && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() =>
                      confirm.open({
                        title: "delete submission",
                        description:
                          "are you sure you want to delete this submission? this action cannot be undone.",
                        confirmText: "delete",
                        onConfirm: () => {
                          deleteSubmission.mutate({
                            data: { submissionId: submission.id },
                          })
                        },
                      })
                    }
                    size="icon-sm"
                    variant="outline"
                  >
                    <TrashIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>delete</TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="mx-1 h-6" />
            </>
          )}
          {sessionUser && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={likeUnlike.mutate}
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
          {submission.likes.length > 0 && (
            <Tooltip>
              <UsersDialog
                users={submission.likes.map((l) => l.user)}
                title={`${submission.likes.length} ${pluralize("Like", submission.likes.length)}`}
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
          {sessionUser && !isOwner && (
            <FlagTray entityType="riuSubmission" entityId={submission.id} />
          )}
        </div>
      </div>

      {submission.video?.playbackId && (
        <VideoPlayer playbackId={submission.video.playbackId} />
      )}

      <MessagesView
        record={record}
        messages={messagesQuery.data.messages}
        handleCreateMessage={(content) => createMessage.mutate(content)}
        scrollTargetId="main-content"
      />
    </>
  )
}
