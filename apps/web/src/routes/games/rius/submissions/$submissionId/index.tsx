import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import {
  EllipsisVerticalIcon,
  FlagIcon,
  ShareIcon,
  TrashIcon,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { confirm } from "~/components/confirm-dialog"
import { FlagTray } from "~/components/flag-tray"
import { SetCard } from "~/components/games/set-card"
import { LikesButtonGroup } from "~/components/likes-button-group"
import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import { SectionDivider } from "~/components/ui/section-divider"
import { getMuxPoster, VideoPlayer } from "~/components/video-player"
import { games } from "~/lib/games"
import { useDeleteSubmission } from "~/lib/games/rius/hooks"
import { useHaptics } from "~/lib/haptics"
import { invariant } from "~/lib/invariant"
import { messages } from "~/lib/messages"
import { useCreateMessage } from "~/lib/messages/hooks"
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks"
import { seo } from "~/lib/seo"
import { useSessionUser } from "~/lib/session/hooks"
import { session } from "~/lib/session/index"
import { DetailHeader } from "~/views/detail-header"
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
      title: submission.riuSet.name,
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
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
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
      <DetailHeader>
        <DetailHeader.Title
          meta={[
            <Link
              key="author"
              to="/users/$userId"
              params={{ userId: submission.user.id }}
              className="hover:underline"
            >
              {submission.user.name}
            </Link>,
            <RelativeTimeCard
              key="time"
              date={submission.createdAt}
              variant="muted"
            />,
          ]}
        >
          {submission.riuSet.name}
        </DetailHeader.Title>
        <DetailHeader.Actions>
          <LikesButtonGroup
            users={submission.likes.map((l) => l.user)}
            authUserLiked={authUserLiked}
            onLikeUnlike={sessionUser ? likeUnlike.mutate : undefined}
          />
          <SubmissionActionsMenu
            submission={submission}
            isOwner={isOwner}
            canFlag={Boolean(sessionUser && !isOwner)}
            onDelete={() =>
              deleteSubmission.mutate({
                data: { submissionId: submission.id },
              })
            }
          />
        </DetailHeader.Actions>
      </DetailHeader>

      {submission.video?.playbackId && (
        <VideoPlayer playbackId={submission.video.playbackId} />
      )}

      <MessagesView
        record={record}
        messages={messagesQuery.data.messages}
        handleCreateMessage={(content) => createMessage.mutate(content)}
        scrollTargetId="main-content"
      />

      <div className="space-y-3">
        <SectionDivider>set</SectionDivider>
        <SetCard set={submission.riuSet} />
      </div>
    </>
  )
}

function SubmissionActionsMenu({
  submission,
  isOwner,
  canFlag,
  onDelete,
}: {
  submission: { id: number }
  isOwner: boolean
  canFlag: boolean
  onDelete: () => void
}) {
  const haptics = useHaptics()
  const [flagOpen, setFlagOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="icon-sm" variant="outline" aria-label="actions" />
          }
        >
          <EllipsisVerticalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(globalThis.location.href)
              haptics.success()
              toast.success("link copied")
            }}
          >
            <ShareIcon />
            share
          </DropdownMenuItem>
          {canFlag && (
            <DropdownMenuItem onClick={() => setFlagOpen(true)}>
              <FlagIcon />
              flag
            </DropdownMenuItem>
          )}
          {isOwner && (
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                confirm.open({
                  title: "delete submission",
                  description:
                    "are you sure you want to delete this submission? this action cannot be undone.",
                  confirmText: "delete",
                  onConfirm: onDelete,
                })
              }
            >
              <TrashIcon />
              delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canFlag && (
        <FlagTray
          entityType="riuSubmission"
          entityId={submission.id}
          hideTrigger
          open={flagOpen}
          onOpenChange={setFlagOpen}
        />
      )}
    </>
  )
}
