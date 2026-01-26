import type { MuxPlayerRefAttributes } from "@mux/mux-player-react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { ArrowLeftIcon, MonitorIcon, TvIcon } from "lucide-react";
import { useRef, useState } from "react";

import { toast } from "sonner";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { getMuxPoster, VideoPlayer } from "~/components/video-player";
import { invariant } from "~/lib/invariant";
import { session } from "~/lib/session";
import { utv } from "~/lib/utv/core";

const pathParametersSchema = z.object({
  videoId: z.coerce.number(),
});

export const Route = createFileRoute("/vault/$videoId/edit")({
  params: {
    parse: pathParametersSchema.parse,
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
    await context.queryClient.ensureQueryData(utv.get.queryOptions(videoId));
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { videoId } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: video } = useSuspenseQuery(utv.get.queryOptions(videoId));

  invariant(video, "Video not found");

  const [localScale, setLocalScale] = useState(video.thumbnailScale);
  const [localSeconds, setLocalSeconds] = useState(video.thumbnailSeconds);
  const [localTitle, setLocalTitle] = useState(video.title);
  const playerRef = useRef<MuxPlayerRefAttributes>(null);

  const updateScale = useMutation({ mutationFn: utv.updateScale.fn });
  const updateThumbnailSeconds = useMutation({
    mutationFn: utv.updateThumbnailSeconds.fn,
  });
  const updateTitle = useMutation({ mutationFn: utv.updateTitle.fn });

  const isSaving =
    updateScale.isPending ||
    updateThumbnailSeconds.isPending ||
    updateTitle.isPending;

  const handleCaptureTimestamp = () => {
    const currentTime = playerRef.current?.currentTime;
    if (currentTime !== undefined) {
      setLocalSeconds(Math.floor(currentTime));
    }
  };

  const handleSave = async () => {
    try {
      const promises: Promise<unknown>[] = [];

      if (localTitle !== video.title) {
        promises.push(
          updateTitle.mutateAsync({ data: { id: videoId, title: localTitle } }),
        );
      }
      if (localScale !== video.thumbnailScale) {
        promises.push(
          updateScale.mutateAsync({ data: { id: videoId, scale: localScale } }),
        );
      }
      if (localSeconds !== video.thumbnailSeconds) {
        promises.push(
          updateThumbnailSeconds.mutateAsync({
            data: { id: videoId, thumbnailSeconds: localSeconds },
          }),
        );
      }

      if (promises.length === 0) {
        router.navigate({ to: "/vault/$videoId", params: { videoId } });
        return;
      }

      await Promise.all(promises);
      toast.success("Saved");
      qc.removeQueries({ queryKey: utv.get.queryOptions(videoId).queryKey });
      qc.removeQueries({
        queryKey: utv.list.infiniteQueryOptions({}).queryKey,
      });
      router.navigate({ to: "/vault/$videoId", params: { videoId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
        <Button variant="ghost" size="sm" asChild className="-ml-3 self-start">
          <Link to="/vault/$videoId" params={{ videoId }}>
            <ArrowLeftIcon className="size-4" />
            Back
          </Link>
        </Button>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">edit video</h1>
          <div className="flex gap-2">
            {video.video?.assetId && (
              <Button variant="secondary" size="sm" asChild>
                <a
                  href={`https://dashboard.mux.com/organizations/rm30mj/environments/62jevu/video/assets/${video.video.assetId}/monitor`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MonitorIcon className="size-3" />
                  Mux
                </a>
              </Button>
            )}
            <Button variant="secondary" size="sm" asChild>
              <a
                href={video.legacyUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <TvIcon className="size-3" />
                UTV
              </a>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Name</Label>
          <Input
            id="title"
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            placeholder="Video title"
          />
        </div>

        <div className="space-y-2">
          <Label>Scale</Label>
          <div className="flex items-center gap-4">
            {video.video?.playbackId && (
              <div className="relative aspect-video h-16 shrink-0 overflow-clip rounded-md border">
                <img
                  src={getMuxPoster({
                    playbackId: video.video.playbackId,
                    time: localSeconds,
                    width: 160,
                  })}
                  alt="Thumbnail preview"
                  className="h-full w-full object-cover"
                  style={{
                    transform: `scale(${localScale})`,
                  }}
                />
              </div>
            )}
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={localScale}
              onChange={(e) => setLocalScale(Number.parseFloat(e.target.value))}
              className="accent-primary h-2 grow cursor-pointer"
            />
            <span className="text-muted-foreground w-12 text-sm tabular-nums">
              {(localScale * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {video.video?.playbackId && (
          <div className="space-y-2">
            <Label>Thumbnail</Label>
            <VideoPlayer ref={playerRef} playbackId={video.video.playbackId} />
            <Button
              variant="secondary"
              size="sm"
              className="w-fit"
              onClick={handleCaptureTimestamp}
            >
              Capture Timestamp ({localSeconds}s)
            </Button>
          </div>
        )}

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
