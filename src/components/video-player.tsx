import MuxPlayer, { type MuxPlayerRefAttributes } from "@mux/mux-player-react";

import queryString from "query-string";

import { cn } from "~/lib/utils";

export function getMuxPoster({
  playbackId,
  width,
  height,
  time = 0,
}: {
  playbackId: null | string | undefined;
  time?: number;
  height?: number;
  width?: number;
}) {
  if (!playbackId) {
    return undefined;
  }

  return queryString.stringifyUrl({
    url: `https://image.mux.com/${playbackId}/thumbnail.png`,
    query: {
      time,
      height,
      width,
    },
  });
}

export function VideoPlayer({
  playbackId,
  className,
  ref,
  ...props
}: {
  playbackId: string;
  ref?: React.Ref<MuxPlayerRefAttributes>;
} & React.ComponentProps<"div">) {
  return (
    <div
      className={cn("aspect-video shrink-0 overflow-hidden rounded-lg", className)}
      {...props}
    >
      <MuxPlayer
        ref={ref}
        accentColor="#000000"
        className="aspect-video"
        playbackId={playbackId}
        playbackRates={[0.1, 0.25, 0.5, 0.75, 1]}
        poster={getMuxPoster({ playbackId })}
        preload="none"
        startTime={0.001}
        streamType="on-demand"
      />
    </div>
  );
}

export { type MuxPlayerRefAttributes } from "@mux/mux-player-react";
