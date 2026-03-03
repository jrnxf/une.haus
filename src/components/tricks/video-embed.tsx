type VideoEmbedProps = {
  url: string
  timestamp?: string | null
  title?: string
}

type VideoInfo = {
  type: "youtube" | "vimeo" | null
  videoId: string | null
  startSeconds: number
}

function parseTimestamp(ts: string): number {
  const parts = ts.split(":").map(Number)
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return 0
}

function parseVideoUrl(url: string, timestamp?: string | null): VideoInfo {
  const startSeconds = timestamp ? parseTimestamp(timestamp) : 0

  // YouTube: youtube.com/watch?v=xxx, youtu.be/xxx, youtube.com/embed/xxx
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ]

  for (const pattern of youtubePatterns) {
    const match = url.match(pattern)
    if (match) {
      return { type: "youtube", videoId: match[1], startSeconds }
    }
  }

  // Vimeo: vimeo.com/xxxxx
  const vimeoPattern = /vimeo\.com\/(\d+)/
  const vimeoMatch = url.match(vimeoPattern)
  if (vimeoMatch) {
    return { type: "vimeo", videoId: vimeoMatch[1], startSeconds }
  }

  return { type: null, videoId: null, startSeconds }
}

export function VideoEmbed({ url, timestamp, title }: VideoEmbedProps) {
  const { type, videoId, startSeconds } = parseVideoUrl(url, timestamp)

  if (!type || !videoId) {
    return (
      <a
        className="text-primary hover:underline"
        href={url}
        rel="noopener noreferrer"
        target="_blank"
      >
        Watch video
      </a>
    )
  }

  if (type === "youtube") {
    const embedUrl = startSeconds
      ? `https://www.youtube.com/embed/${videoId}?start=${startSeconds}`
      : `https://www.youtube.com/embed/${videoId}`

    return (
      <iframe
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full rounded-lg"
        sandbox="allow-scripts allow-popups allow-presentation"
        src={embedUrl}
        title={title ?? "Video"}
      />
    )
  }

  if (type === "vimeo") {
    const embedUrl = startSeconds
      ? `https://player.vimeo.com/video/${videoId}#t=${startSeconds}s`
      : `https://player.vimeo.com/video/${videoId}`

    return (
      <iframe
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full rounded-lg"
        sandbox="allow-scripts allow-popups allow-presentation"
        src={embedUrl}
        title={title ?? "Video"}
      />
    )
  }

  return null
}
