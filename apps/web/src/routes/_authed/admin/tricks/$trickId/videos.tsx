import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  GhostIcon,
  Trash2,
  XCircle,
} from "lucide-react"
import pluralize from "pluralize"
import { useState } from "react"
import { toast } from "sonner"

import { PageHeader } from "~/components/page-header"
import { RichText } from "~/components/rich-text"
import { Alert, AlertDescription } from "~/components/ui/alert"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { Textarea } from "~/components/ui/textarea"
import { VideoPlayer } from "~/components/video-player"
import { tricks } from "~/lib/tricks"

const MAX_ACTIVE_VIDEOS = 5

export const Route = createFileRoute("/_authed/admin/tricks/$trickId/videos")({
  loader: async ({ context, params }) => {
    const trickId = Number(params.trickId)
    await Promise.all([
      context.queryClient.ensureQueryData(
        tricks.getById.queryOptions({ id: trickId }),
      ),
      context.queryClient.ensureQueryData(
        tricks.videos.list.queryOptions({ trickId }),
      ),
    ])
  },
  component: RouteComponent,
})

function RouteComponent() {
  const qc = useQueryClient()
  const { trickId } = Route.useParams()
  const numericTrickId = Number(trickId)

  const { data: trick } = useSuspenseQuery(
    tricks.getById.queryOptions({ id: numericTrickId }),
  )

  const { data: allVideos } = useSuspenseQuery(
    tricks.videos.list.queryOptions({ trickId: numericTrickId }),
  )

  const videosQueryKey = tricks.videos.list.queryOptions({
    trickId: numericTrickId,
  }).queryKey
  const graphQueryKey = tricks.graph.queryOptions().queryKey

  const activeVideos = allVideos.filter((v) => v.status === "active")
  const pendingVideos = allVideos.filter((v) => v.status === "pending")
  const rejectedVideos = allVideos.filter((v) => v.status === "rejected")

  const isAtLimit = activeVideos.length >= MAX_ACTIVE_VIDEOS

  const reviewVideo = useMutation({
    mutationFn: tricks.videos.review.fn,
    onSuccess: (_, variables) => {
      qc.removeQueries({ queryKey: graphQueryKey })
      qc.invalidateQueries({ queryKey: videosQueryKey })
      toast.success(
        variables.data.status === "active"
          ? "video approved"
          : "video rejected",
      )
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const demoteVideo = useMutation({
    mutationFn: tricks.videos.demote.fn,
    onSuccess: () => {
      qc.removeQueries({ queryKey: graphQueryKey })
      qc.invalidateQueries({ queryKey: videosQueryKey })
      toast.success("video demoted to pending")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteVideo = useMutation({
    mutationFn: tricks.videos.delete.fn,
    onSuccess: () => {
      qc.removeQueries({ queryKey: graphQueryKey })
      qc.invalidateQueries({ queryKey: videosQueryKey })
      toast.success("video deleted")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const reorderVideos = useMutation({
    mutationFn: tricks.videos.reorder.fn,
    onSuccess: () => {
      qc.removeQueries({ queryKey: graphQueryKey })
      qc.invalidateQueries({ queryKey: videosQueryKey })
      toast.success("videos reordered")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const moveVideo = (videoId: number, direction: "up" | "down") => {
    const currentIndex = activeVideos.findIndex((v) => v.id === videoId)
    if (currentIndex === -1) return

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= activeVideos.length) return

    const newOrder = [...activeVideos]
    ;[newOrder[currentIndex], newOrder[newIndex]] = [
      newOrder[newIndex],
      newOrder[currentIndex],
    ]

    reorderVideos.mutate({
      data: {
        trickId: numericTrickId,
        videoIds: newOrder.map((v) => v.id),
      },
    })
  }

  if (!trick) {
    return (
      <div className="p-6">
        <p>trick not found</p>
      </div>
    )
  }

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tricks">tricks</PageHeader.Crumb>
          <PageHeader.Crumb>{trick.name}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-3xl space-y-6 p-4">
        <p className="text-muted-foreground text-sm">
          {activeVideos.length}/{MAX_ACTIVE_VIDEOS} active{" "}
          {pluralize("video", activeVideos.length)}
        </p>

        {/* Active Videos */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            active videos
            <Badge variant="secondary" className="ml-2">
              {activeVideos.length}
            </Badge>
          </h2>

          {isAtLimit && (
            <Alert>
              <AlertDescription>
                this trick has the maximum of {MAX_ACTIVE_VIDEOS} active{" "}
                {pluralize("video", MAX_ACTIVE_VIDEOS)}. demote one to add more.
              </AlertDescription>
            </Alert>
          )}

          {activeVideos.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GhostIcon />
                </EmptyMedia>
                <EmptyTitle>no active videos</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeVideos.map((video, index) => (
                <Card key={video.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        video {index + 1}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => moveVideo(video.id, "up")}
                          disabled={index === 0 || reorderVideos.isPending}
                        >
                          <ArrowUp className="size-3" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => moveVideo(video.id, "down")}
                          disabled={
                            index === activeVideos.length - 1 ||
                            reorderVideos.isPending
                          }
                        >
                          <ArrowDown className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {video.video?.playbackId && (
                      <VideoPlayer playbackId={video.video.playbackId} />
                    )}
                    {video.notes && (
                      <RichText
                        content={video.notes}
                        className="text-muted-foreground text-sm"
                      />
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() =>
                          demoteVideo.mutate({ data: { id: video.id } })
                        }
                        disabled={demoteVideo.isPending}
                      >
                        <XCircle className="size-4" />
                        demote
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          deleteVideo.mutate({ data: { id: video.id } })
                        }
                        disabled={deleteVideo.isPending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Pending Videos */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            pending videos
            <Badge variant="secondary" className="ml-2">
              {pendingVideos.length}
            </Badge>
          </h2>

          {pendingVideos.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GhostIcon />
                </EmptyMedia>
                <EmptyTitle>no pending videos</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingVideos.map((video) => (
                <PendingVideoCard
                  key={video.id}
                  video={video}
                  onReview={(status, reviewNotes) =>
                    reviewVideo.mutate({
                      data: { id: video.id, status, reviewNotes },
                    })
                  }
                  onDelete={() =>
                    deleteVideo.mutate({ data: { id: video.id } })
                  }
                  isReviewPending={reviewVideo.isPending}
                  isDeletePending={deleteVideo.isPending}
                  isAtLimit={isAtLimit}
                />
              ))}
            </div>
          )}
        </section>

        {/* Rejected Videos */}
        {rejectedVideos.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">
              rejected videos
              <Badge variant="secondary" className="ml-2">
                {rejectedVideos.length}
              </Badge>
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              {rejectedVideos.map((video) => (
                <Card key={video.id} className="opacity-60">
                  <CardHeader>
                    <p className="text-muted-foreground text-xs">
                      submitted by {video.submittedBy.name}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {video.video?.playbackId && (
                      <VideoPlayer playbackId={video.video.playbackId} />
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full"
                      onClick={() =>
                        deleteVideo.mutate({ data: { id: video.id } })
                      }
                      disabled={deleteVideo.isPending}
                    >
                      <Trash2 className="size-4" />
                      delete permanently
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}

function PendingVideoCard({
  video,
  onReview,
  onDelete,
  isReviewPending,
  isDeletePending,
  isAtLimit,
}: {
  video: {
    id: number
    notes: string | null
    video: { playbackId: string | null } | null
    submittedBy: { name: string }
  }
  onReview: (status: "active" | "rejected", reviewNotes: string) => void
  onDelete: () => void
  isReviewPending: boolean
  isDeletePending: boolean
  isAtLimit: boolean
}) {
  const [notes, setNotes] = useState("")
  const trimmed = notes.trim()

  return (
    <Card>
      <CardHeader>
        <p className="text-muted-foreground text-xs">
          submitted by {video.submittedBy.name}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {video.video?.playbackId && (
          <VideoPlayer playbackId={video.video.playbackId} />
        )}
        {video.notes && (
          <RichText
            content={video.notes}
            className="text-muted-foreground text-sm"
          />
        )}
        <Textarea
          placeholder="review notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onReview("active", trimmed)}
            disabled={isReviewPending || isAtLimit || !trimmed}
            title={isAtLimit ? "demote an active video first" : "approve video"}
          >
            <CheckCircle className="size-4" />
            approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onReview("rejected", trimmed)}
            disabled={isReviewPending || !trimmed}
          >
            <XCircle className="size-4" />
            reject
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onDelete}
            disabled={isDeletePending}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
