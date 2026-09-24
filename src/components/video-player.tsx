import MuxPlayer, { type MuxPlayerRefAttributes } from "@mux/mux-player-react"

import { getMuxPoster } from "~/lib/mux/poster"
import { cn } from "~/lib/utils"

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
        poster={
          showPoster ? getMuxPoster({ playbackId, width: 1600 }) : undefined
        }
        preload={autoPlay ? "auto" : "none"}
        startTime={0.001}
        streamType="on-demand"
      />
    </div>
  )
}
