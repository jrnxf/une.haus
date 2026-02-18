import type { MuxPlayerRefAttributes } from "@mux/mux-player-react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { MonitorIcon, ShieldIcon, TvIcon } from "lucide-react";
import { useRef, useState } from "react";

import { toast } from "sonner";
import { z } from "zod";

import { DisciplineSelector } from "~/components/input/discipline-selector";
import { RiderSelector } from "~/components/input/rider-selector";
import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { UserDiscipline } from "~/db/schema";
import { getMuxPoster, VideoPlayer } from "~/components/video-player";
import { invariant } from "~/lib/invariant";
import { session } from "~/lib/session";
import {
  generateOrderId,
  type OrderedRiderEntry,
} from "~/lib/tourney/bracket";
import { utv } from "~/lib/utv/core";

const pathParametersSchema = z.object({
  videoId: z.coerce.number(),
});

export const Route = createFileRoute("/vault/$videoId/edit")({
  params: {
    parse: pathParametersSchema.parse,
  },
  staticData: {
    pageHeader: {
      breadcrumbs: [
        { label: "vault", to: "/vault" },
        { label: "" },
        { label: "edit" },
      ],
      maxWidth: "4xl",
    },
  },
  beforeLoad: async ({ context }) => {
    const sessionData = await context.queryClient.ensureQueryData(
      session.get.queryOptions(),
    );

    if (!sessionData.user || sessionData.user.id !== 1) {
      throw redirect({ to: "/vault" });
    }
  },
  loader: async ({ context, params: { videoId } }) => {
    const videoData = await context.queryClient.ensureQueryData(
      utv.get.queryOptions(videoId),
    );
    return {
      pageHeader: {
        breadcrumbOverrides: {
          1: {
            label: (videoData as { title?: string })?.title || "video",
            to: `/vault/${videoId}`,
          },
        },
      },
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { videoId } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: video } = useSuspenseQuery(utv.get.queryOptions(videoId));

  invariant(video, "Video not found");

  const [title, setTitle] = useState(video.title);
  const [disciplines, setDisciplines] = useState<UserDiscipline[]>(
    video.disciplines ?? [],
  );
  const [riders, setRiders] = useState<OrderedRiderEntry[]>(
    video.riders.map((r) => ({
      orderId: generateOrderId(),
      userId: r.userId,
      name: r.user?.name ?? r.name,
    })),
  );
  const [scale, setScale] = useState(video.thumbnailScale);
  const [thumbnailSeconds, setThumbnailSeconds] = useState(
    video.thumbnailSeconds,
  );
  const playerRef = useRef<MuxPlayerRefAttributes>(null);

  const save = useMutation({
    mutationFn: utv.adminUpdate.fn,
    onSuccess: () => {
      toast.success("Saved");
      qc.removeQueries({ queryKey: utv.get.queryOptions(videoId).queryKey });
      qc.removeQueries({
        queryKey: utv.list.infiniteQueryOptions({}).queryKey,
      });
      router.navigate({ to: "/vault/$videoId", params: { videoId } });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCaptureTimestamp = () => {
    const currentTime = playerRef.current?.currentTime;
    if (currentTime !== undefined) {
      setThumbnailSeconds(Math.floor(currentTime));
    }
  };

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
    });
  };

  return (
    <>
      <PageHeader>
        <PageHeader.Actions>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon-xs"
                aria-label="Admin menu"
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
                    Mux
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
                  UTV
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </PageHeader.Actions>
      </PageHeader>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
          <div className="space-y-2">
            <Label htmlFor="title">Name</Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Video title"
            />
          </div>

          <div className="space-y-2">
            <Label>Disciplines</Label>
            <DisciplineSelector
              value={disciplines}
              onChange={setDisciplines}
            />
          </div>

          <div className="space-y-2">
            <Label>Riders</Label>
            <RiderSelector value={riders} onChange={setRiders} />
          </div>

          <div className="space-y-2">
            <Label>Scale</Label>
            <div className="flex items-center gap-4">
              {video.video?.playbackId && (
                <div className="relative aspect-video h-16 shrink-0 overflow-clip rounded-md border">
                  <img
                    src={getMuxPoster({
                      playbackId: video.video.playbackId,
                      time: thumbnailSeconds,
                      width: 160,
                    })}
                    alt="Thumbnail preview"
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
                onChange={(e) =>
                  setScale(Number.parseFloat(e.target.value))
                }
                className="accent-primary h-2 grow cursor-pointer"
              />
              <span className="text-muted-foreground w-12 text-sm tabular-nums">
                {(scale * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {video.video?.playbackId && (
            <div className="space-y-2">
              <Label>Thumbnail</Label>
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
                Capture Timestamp ({thumbnailSeconds}s)
              </Button>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={save.isPending}>
              {save.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
