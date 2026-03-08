import { type MuxPlayerRefAttributes } from "@mux/mux-player-react"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { MonitorIcon, ShieldIcon, TvIcon } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { ContentHeaderRow } from "~/components/content-header-row"
import { DisciplineSelector } from "~/components/input/discipline-selector"
import { RiderSelector } from "~/components/input/rider-selector"
import { PageHeader } from "~/components/page-header"
import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { getMuxPoster, VideoPlayer } from "~/components/video-player"
import { type UserDiscipline } from "~/db/schema"
import { invariant } from "~/lib/invariant"
import { session } from "~/lib/session"
import { generateOrderId, type OrderedRiderEntry } from "~/lib/tourney/bracket"
import { utv } from "~/lib/utv/core"

const pathParametersSchema = z.object({
  videoId: z.coerce.number(),
})

export const Route = createFileRoute("/vault/$videoId/edit")({
  params: {
    parse: pathParametersSchema.parse,
  },
  beforeLoad: async ({ context, params }) => {
    const sessionData = await context.queryClient.ensureQueryData(
      session.get.queryOptions(),
    )

    if (!sessionData.user) {
      throw redirect({ to: "/vault" })
    }
    if (sessionData.user.id !== 1) {
      throw redirect({
        to: "/vault/$videoId/suggest",
        params: { videoId: params.videoId },
      })
    }
  },
  loader: async ({ context, params: { videoId } }) => {
    await context.queryClient.ensureQueryData(utv.get.queryOptions(videoId))
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { videoId } = Route.useParams()
  const router = useRouter()
  const qc = useQueryClient()

  const { data: video } = useSuspenseQuery(utv.get.queryOptions(videoId))

  invariant(video, "Video not found")

  const [title, setTitle] = useState(video.title)
  const [disciplines, setDisciplines] = useState<UserDiscipline[]>(
    video.disciplines ?? [],
  )
  const [riders, setRiders] = useState<OrderedRiderEntry[]>(
    video.riders.map((r) => ({
      orderId: generateOrderId(),
      userId: r.userId,
      name: r.user?.name ?? r.name,
    })),
  )
  const [scale, setScale] = useState(video.thumbnailScale)
  const [thumbnailSeconds, setThumbnailSeconds] = useState(
    video.thumbnailSeconds,
  )
  const playerRef = useRef<MuxPlayerRefAttributes>(null)

  const save = useMutation({
    mutationFn: utv.adminUpdate.fn,
    onSuccess: () => {
      toast.success("saved")
      qc.removeQueries({ queryKey: utv.get.queryOptions(videoId).queryKey })
      qc.removeQueries({
        queryKey: utv.list.infiniteQueryOptions({}).queryKey,
      })
      router.navigate({ to: "/vault/$videoId", params: { videoId } })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleCaptureTimestamp = () => {
    const currentTime = playerRef.current?.currentTime
    if (currentTime !== undefined) {
      setThumbnailSeconds(Math.floor(currentTime))
    }
  }

  const handleSave = () => {
    save.mutate({
      data: {
        id: videoId,
        title,
        disciplines: disciplines.length > 0 ? disciplines : null,
        riders: riders.map((r) => ({ userId: r.userId, name: r.name })),
        thumbnailScale: scale,
        thumbnailSeconds,
      },
    })
  }

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/vault">vault</PageHeader.Crumb>
          <PageHeader.Crumb to={`/vault/${videoId}`}>
            {video.title || "video"}
          </PageHeader.Crumb>
          <PageHeader.Crumb>edit</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4">
          <ContentHeaderRow
            className="max-w-none"
            left={<p className="text-muted-foreground text-xs">admin tools</p>}
            right={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon-xs"
                    aria-label="admin menu"
                  >
                    <ShieldIcon className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {video.video?.assetId && (
                    <DropdownMenuItem asChild>
                      <a
                        href={`https://dashboard.mux.com/organizations/rm30mj/environments/62jevu/video/assets/${video.video.assetId}/monitor`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MonitorIcon className="size-4" />
                        mux
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <a
                      href={video.legacyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <TvIcon className="size-4" />
                      utv
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />

          <div className="space-y-2">
            <Label htmlFor="title">name</Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="video title"
            />
          </div>

          <div className="space-y-2">
            <Label>disciplines</Label>
            <DisciplineSelector value={disciplines} onChange={setDisciplines} />
          </div>

          <div className="space-y-2">
            <Label>riders</Label>
            <RiderSelector value={riders} onChange={setRiders} />
          </div>

          <div className="space-y-2">
            <Label>scale</Label>
            <div className="flex items-center gap-4">
              {video.video?.playbackId && (
                <div className="relative aspect-video h-16 shrink-0 overflow-clip rounded-md border">
                  <img
                    src={getMuxPoster({
                      playbackId: video.video.playbackId,
                      time: thumbnailSeconds,
                      width: 160,
                    })}
                    alt="thumbnail preview"
                    className="h-full w-full object-cover"
                    style={{
                      transform: `scale(${scale})`,
                    }}
                  />
                </div>
              )}
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={scale}
                onChange={(e) => setScale(Number.parseFloat(e.target.value))}
                className="accent-primary h-2 grow cursor-pointer"
              />
              <span className="text-muted-foreground w-12 text-sm tabular-nums">
                {(scale * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {video.video?.playbackId && (
            <div className="space-y-2">
              <Label>thumbnail</Label>
              <VideoPlayer
                ref={playerRef}
                playbackId={video.video.playbackId}
              />
              <Button
                variant="secondary"
                size="sm"
                className="w-fit"
                onClick={handleCaptureTimestamp}
              >
                capture timestamp ({thumbnailSeconds}s)
              </Button>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={save.isPending}>
              {save.isPending ? "saving..." : "save"}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
