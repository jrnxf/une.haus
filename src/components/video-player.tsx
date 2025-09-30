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
        preload="none"
        startTime={0.001}
        streamType="on-demand"
      />
    </div>
  );
}
