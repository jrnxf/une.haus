export function YoutubeIframe({ videoId }: { videoId: string }) {
  return (
    <iframe
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className="aspect-video w-full rounded-lg"
      sandbox="allow-scripts allow-popups allow-presentation"
      src={`https://www.youtube.com/embed/${videoId}`}
      // TODO better title
      title="YouTube video player"
    />
  )
}
