// NOTE: not using @mux/mux-player-react/lazy below is intentional. When I had
// it at /lazy, if a video was inside an accordion (which lazy mounts its
// elements) there was a good chance the video would just fail to load altogether
import MuxPlayer from "@mux/mux-player-react";

export function getMuxPoster(playbackId: null | string | undefined) {
  return playbackId
    ? `https://image.mux.com/${playbackId}/thumbnail.png?time=0`
    : undefined;
}

export function VideoPlayer({ playbackId }: { playbackId: string }) {
  return (
    <div className="aspect-video overflow-hidden rounded-lg">
      <MuxPlayer
        accentColor="#000000"
        className="aspect-video"
        playbackId={playbackId}
        playbackRates={[0.1, 0.25, 0.5, 0.75, 1]}
        poster={getMuxPoster(playbackId)}
        preload="none" // save on bandwidth
        // for some reason when I set the start time at 0, mux will load shorter clips
        // at the end of their timestamp. setting 0.001 seems te be respected though
        startTime={0.001}
        streamType="on-demand"
      />
    </div>
  );
}
