import type { MuxPlayerRefAttributes } from "@mux/mux-player-react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MonitorIcon, ShieldIcon, TvIcon } from "lucide-react";
import { useRef, useState } from "react";

import { Virtualizer } from "virtua";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { getMuxPoster, VideoPlayer } from "~/components/video-player";
import { useIsAdmin } from "~/lib/session/hooks";
import { utv } from "~/lib/utv";
import {
  useUpdateScale,
  useUpdateThumbnailSeconds,
  useUpdateTitle,
} from "~/lib/utv/hooks";
import { useFzf } from "~/lib/ux/hooks/use-fzf";

export const Route = createFileRoute("/vault/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(utv.all.queryOptions());
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = useSuspenseQuery(utv.all.queryOptions());
  const [query, setQuery] = useState("");
  const [adminMode, setAdminMode] = useState(false);

  const isAdmin = useIsAdmin();

  const lowercasedQuery = query.toLowerCase();

  const fzf = useFzf([data, { selector: (video) => video.title }]);

  const filteredVault = fzf.find(lowercasedQuery);

  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex grow flex-col overflow-hidden">
      {isAdmin && (
        <Button
          variant={adminMode ? "default" : "secondary"}
          size="sm"
          onClick={() => setAdminMode(!adminMode)}
          className="sticky top-0 z-50 ml-auto mr-4 mt-4"
        >
          <ShieldIcon className="size-4" />
          Admin
        </Button>
      )}
      <div className="mx-auto w-full max-w-4xl shrink-0 px-4 pt-4 pb-0">
        <div className="flex items-center gap-2">
          <Input
            id="vault-search"
            value={query}
            onChange={(evt) => setQuery(evt.target.value)}
            placeholder="Search vault"
            className="max-w-2xl"
          />
        </div>
      </div>
      <div className="grow overflow-y-auto" ref={scrollRef}>
        <div className="mx-auto max-w-4xl px-4 pb-4">
          <Accordion collapsible type="single">
            <Virtualizer scrollRef={scrollRef} overscan={12}>
            {filteredVault.map(({ item: video }) => (
              <AccordionItem
                value={String(video.id)}
                key={video.id}
                className="group mt-3 overflow-clip rounded-md border last:border-b"
              >
                <AccordionTrigger className="relative min-w-0 overflow-clip rounded-none py-0 pr-4 pl-0 hover:no-underline">
                  <div className="flex min-h-12 w-full min-w-0 items-center gap-2 overflow-clip group-data-[state=open]:pl-4">
                    <div className="relative aspect-video h-16 overflow-clip transition-all group-data-[state=open]:hidden">
                      <img
                        src={getMuxPoster({
                          playbackId: video.playbackId,
                          time: video.thumbnailSeconds,
                          width: 104 * 2,
                        })}
                        alt={String(video.id)}
                        aria-label={video.title}
                        className="h-full w-full object-cover"
                        style={{
                          transform: `scale(${video.scale})`,
                        }}
                      />
                    </div>
                    <h2 className="truncate font-semibold">{video.title}</h2>
                    <div className="grow" />
                    <div className="flex shrink-0 gap-2">
                      <Button variant="secondary" asChild size="sm">
                        <a
                          href={`https://dashboard.mux.com/organizations/rm30mj/environments/62jevu/video/assets/${video.assetId}/monitor`}
                          target="_blank"
                        >
                          <MonitorIcon className="size-3" />
                          mux
                        </a>
                      </Button>
                      <Button variant="secondary" asChild size="sm">
                        <a href={video.legacyUrl} target="_blank">
                          <TvIcon className="size-3" />
                          utv
                        </a>
                      </Button>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="p-0">
                  {adminMode ? (
                    <AdminScaleEditor
                      videoId={video.id}
                      playbackId={video.playbackId}
                      initialScale={video.scale}
                      thumbnailSeconds={video.thumbnailSeconds}
                      title={video.title}
                    />
                  ) : video.playbackId ? (
                    <VideoPlayer
                      playbackId={video.playbackId}
                      className="rounded-none"
                    />
                  ) : (
                    <p className="p-4">No playback id</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
            </Virtualizer>
          </Accordion>
        </div>
      </div>
    </div>
  );
}

function AdminScaleEditor({
  videoId,
  playbackId,
  initialScale,
  thumbnailSeconds: initialThumbnailSeconds,
  title: initialTitle,
}: {
  videoId: number;
  playbackId: string | null;
  initialScale: number;
  thumbnailSeconds: number;
  title: string;
}) {
  const [localScale, setLocalScale] = useState(initialScale);
  const [localSeconds, setLocalSeconds] = useState(initialThumbnailSeconds);
  const [localTitle, setLocalTitle] = useState(initialTitle);
  const playerRef = useRef<MuxPlayerRefAttributes>(null);
  const updateScale = useUpdateScale();
  const updateThumbnailSeconds = useUpdateThumbnailSeconds();
  const updateTitle = useUpdateTitle();

  const handleSliderRelease = () => {
    if (localScale !== initialScale) {
      updateScale.mutate({
        data: { id: videoId, scale: localScale },
      });
    }
  };

  const handleTitleBlur = () => {
    if (localTitle !== initialTitle) {
      updateTitle.mutate({
        data: { id: videoId, title: localTitle },
      });
    }
  };

  const handleSaveTimestamp = () => {
    const currentTime = playerRef.current?.currentTime;
    if (currentTime !== undefined) {
      const seconds = Math.floor(currentTime);
      setLocalSeconds(seconds);
      updateThumbnailSeconds.mutate({
        data: { id: videoId, thumbnailSeconds: seconds },
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Row 1: Thumbnail + Title */}
      <div className="flex items-center gap-4">
        {playbackId && (
          <div className="relative aspect-video h-20 shrink-0 overflow-clip rounded-md">
            <img
              src={getMuxPoster({
                playbackId,
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
        <Input
          type="text"
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="Title"
          className="grow"
        />
      </div>

      {/* Row 2: Scale slider */}
      <div className="flex items-center gap-4">
        <span className="text-muted-foreground w-12 shrink-0 text-sm font-medium">
          Scale
        </span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={localScale}
          onChange={(e) => setLocalScale(Number.parseFloat(e.target.value))}
          onMouseUp={handleSliderRelease}
          onTouchEnd={handleSliderRelease}
          className="accent-primary h-2 grow cursor-pointer"
        />
        <span className="text-muted-foreground w-12 text-sm tabular-nums">
          {(localScale * 100).toFixed(0)}%
        </span>
      </div>

      {/* Video player */}
      {playbackId && (
        <>
          <VideoPlayer
            ref={playerRef}
            playbackId={playbackId}
            className="rounded-md"
          />
          <Button variant="secondary" onClick={handleSaveTimestamp}>
            Save Timestamp ({localSeconds}s)
          </Button>
        </>
      )}
    </div>
  );
}
