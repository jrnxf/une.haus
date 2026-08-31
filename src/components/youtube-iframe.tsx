export function YoutubeIframe({ videoId }: { videoId: string }) {
  return (
    // eslint-disable-next-line react/iframe-missing-sandbox
    <iframe
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className="aspect-video w-full rounded-md"
      src={`https://www.youtube.com/embed/${videoId}`}
      title={`video player for ${videoId}`}
    />
  )
}
