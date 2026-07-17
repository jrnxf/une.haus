import MuxPlayer, { type MuxPlayerRefAttributes } from "@mux/mux-player-react"
import queryString from "query-string"

import { cn } from "~/lib/utils"

export function getMuxPoster({
  playbackId,
  width,
  height,
  time = 0,
}: {
  playbackId: null | string | undefined
  time?: number
  height?: number
  width?: number
}) {
  if (!playbackId) {
    return undefined
  }

  return queryString.stringifyUrl({
    url: `https://image.mux.com/${playbackId}/thumbnail.png`,
    query: {
      time,
      height,
      width,
    },
  })
}

/**
 * Invisible player that buffers a video ahead of time so it starts instantly
 * when the visible player switches to it (e.g. lightbox next/autoplay).
 */
export function VideoPreload({ playbackId }: { playbackId: string }) {
  return (
    <div hidden>
      <MuxPlayer
        muted
        playbackId={playbackId}
        preload="auto"
        streamType="on-demand"
      />
    </div>
  )
}

export function VideoPlayer({
  playbackId,
  className,
  ref,
  autoPlay,
  onEnded,
  showPoster = true,
  ...props
}: {
  playbackId: string
  ref?: React.Ref<MuxPlayerRefAttributes>
  autoPlay?: boolean
  onEnded?: () => void
  /**
   * Disable for autoplaying players that swap sources (e.g. the lightbox) —
   * otherwise the incoming video's poster flashes before playback starts.
   */
  showPoster?: boolean
} & Omit<React.ComponentProps<"div">, "ref" | "onEnded">) {
  return (
    <div
      className={cn(
        "aspect-video shrink-0 overflow-hidden rounded-sm",
        className,
      )}
      {...props}
    >
      <MuxPlayer
        ref={ref}
        accentColor="#000000"
        autoPlay={autoPlay}
        className="aspect-video"
        onEnded={onEnded}
        playbackId={playbackId}
        playbackRates={[0.1, 0.25, 0.5, 0.75, 1]}
        poster={showPoster ? getMuxPoster({ playbackId }) : undefined}
        preload={autoPlay ? "auto" : "none"}
        startTime={0.001}
        streamType="on-demand"
      />
    </div>
  )
}
