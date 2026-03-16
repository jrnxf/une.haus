import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import {
  EllipsisVerticalIcon,
  FlagIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { confirm } from "~/components/confirm-dialog"
import { FlagTray } from "~/components/flag-tray"
import { CreateRiuSubmissionForm } from "~/components/forms/games/rius"
import { RiuSubmissionCard } from "~/components/games/riu-submission-card"
import { LikesButtonGroup } from "~/components/likes-button-group"
import { RichText } from "~/components/rich-text"
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
import { useAuthGate } from "~/hooks/use-auth-gate"
import { games } from "~/lib/games"
import { useDeleteSet } from "~/lib/games/rius/hooks"
import { useHaptics } from "~/lib/haptics"
import { invariant } from "~/lib/invariant"
import { messages } from "~/lib/messages"
import { useCreateMessage } from "~/lib/messages/hooks"
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks"
import { seo } from "~/lib/seo"
import { type useSessionUser } from "~/lib/session/hooks"
import { session } from "~/lib/session/index"
import { type ServerFnReturn } from "~/lib/types"
import { errorFmt } from "~/lib/utils"
import { CollapsibleMessages } from "~/views/collapsible-messages"
import { DetailHeader } from "~/views/detail-header"

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
      } catch (error) {
        if (errorFmt(error) === "Access denied") {
          throw error
        }
        // Only show flash message on actual navigation, not preload
        if (!preload) {
          await session.flash.set.fn({
            data: { type: "error", message: errorFmt(error) },
          })
        }
        throw redirect({ to: "/games/rius/active" })
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
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
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

  const { sessionUser, authGate } = useAuthGate()

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
  const canManageUpcomingSet = isOwner && set.riu.status === "upcoming"
  const deleteSet = useDeleteSet({ redirectToUpcoming: true })

  return (
    <>
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
            <RelativeTimeCard
              key="created-at"
              date={set.createdAt}
              variant="muted"
            />,
          ]}
        >
          {set.name}
        </DetailHeader.Title>
        <DetailHeader.Actions>
          <LikesButtonGroup
            users={set.likes?.map((l) => l.user) ?? []}
            authUserLiked={authUserLiked}
            onLikeUnlike={() => authGate(() => likeUnlike.mutate())}
          />
          <RiuSetActionsMenu
            set={set}
            canFlag={Boolean(sessionUser && !isOwner)}
            canManageUpcomingSet={canManageUpcomingSet}
            onDelete={() => deleteSet.mutate({ data: { riuSetId: set.id } })}
          />
        </DetailHeader.Actions>
      </DetailHeader>

      {set.instructions && (
        <div className="text-sm wrap-break-word whitespace-pre-wrap sm:text-base">
          <RichText content={set.instructions} />
        </div>
      )}

      {set.video?.playbackId && (
        <VideoPlayer playbackId={set.video.playbackId} />
      )}

      <CollapsibleMessages
        record={record}
        messages={messagesQuery.data.messages}
        onCreateMessage={(content) => createMessage.mutate(content)}
        initialVisibleCount={2}
      />

      <SubmissionsTab
        set={set}
        setId={setId}
        isOwner={isOwner}
        sessionUser={sessionUser}
      />
    </>
  )
}

function SubmissionsTab({
  set,
  setId,
  isOwner,
  sessionUser,
}: {
  set: NonNullable<ServerFnReturn<typeof games.rius.sets.get.fn>>
  setId: number
  isOwner: boolean
  sessionUser: ReturnType<typeof useSessionUser>
}) {
  const canSubmit = set.riu.status === "active" && !isOwner
  const hasSubmissions = set.submissions && set.submissions.length > 0

  return (
    <div className="space-y-3">
      <SectionDivider>
        {set.submissions.length}{" "}
        {set.submissions.length === 1 ? "submission" : "submissions"}
      </SectionDivider>

      {hasSubmissions ? (
        <SubmissionsList submissions={set.submissions} set={set} />
      ) : null}

      {canSubmit &&
        (sessionUser ? (
          <CreateRiuSubmissionForm riuSetId={setId} />
        ) : (
          <AuthGateUploadButton />
        ))}
    </div>
  )
}

type SubmissionType = NonNullable<
  ServerFnReturn<typeof games.rius.sets.get.fn>
>["submissions"][number]

function SubmissionCard({
  submission,
  set,
}: {
  submission: SubmissionType
  set: {
    user: {
      id: number
      name: string
    }
    name: string
    instructions: string | null
  }
}) {
  return <RiuSubmissionCard submission={submission} set={set} />
}

function SubmissionsList({
  submissions,
  set,
}: {
  submissions: SubmissionType[]
  set: {
    user: {
      id: number
      name: string
    }
    name: string
    instructions: string | null
  }
}) {
  return (
    <div className="flex flex-col gap-2">
      {submissions.map((submission) => (
        <SubmissionCard key={submission.id} submission={submission} set={set} />
      ))}
    </div>
  )
}

function AuthGateUploadButton() {
  const { authGate } = useAuthGate()
  return (
    <Button
      variant="unstyled"
      type="button"
      className="border-input ring-offset-background dark:bg-input/30 text-foreground relative inline-flex h-9 w-fit items-center justify-start overflow-hidden rounded-md border bg-transparent px-3 py-1 text-base font-normal focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
      style={{ borderColor: "var(--input)" }}
      onClick={() => authGate(() => {})}
    >
      <span className="text-muted-foreground block w-full truncate text-left text-sm">
        upload video
      </span>
    </Button>
  )
}

function RiuSetActionsMenu({
  set,
  canFlag,
  canManageUpcomingSet,
  onDelete,
}: {
  set: { id: number }
  canFlag: boolean
  canManageUpcomingSet: boolean
  onDelete: () => void
}) {
  const haptics = useHaptics()
  const [flagOpen, setFlagOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="outline" aria-label="actions">
            <EllipsisVerticalIcon className="size-4" />
          </Button>
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
          {canManageUpcomingSet && (
            <>
              <DropdownMenuItem asChild>
                <Link
                  to="/games/rius/sets/$setId/edit"
                  params={{ setId: set.id }}
                >
                  <PencilIcon />
                  edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() =>
                  confirm.open({
                    title: "delete set",
                    description:
                      "are you sure you want to delete this set? this action cannot be undone.",
                    confirmText: "delete",
                    onConfirm: onDelete,
                  })
                }
              >
                <TrashIcon />
                delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canFlag && (
        <FlagTray
          entityType="riuSet"
          entityId={set.id}
          hideTrigger
          open={flagOpen}
          onOpenChange={setFlagOpen}
        />
      )}
    </>
  )
}
