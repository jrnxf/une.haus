import { Tailwind } from "@react-email/components"

type FeedbackTemplateProps = {
  userName: string
  userEmail: string
  content: string
  media?:
    | { type: "image"; value: string }
    | { type: "video"; assetId: string; playbackId: string }
    | null
}

export default function FeedbackTemplate({
  userName,
  userEmail,
  content,
  media,
}: FeedbackTemplateProps) {
  const imageUrl =
    media?.type === "image"
      ? `https://une.haus/cdn-cgi/imagedelivery/-HCgnZBcmFH51trvA-5j4Q/${media.value}/width=500,quality=80`
      : undefined

  const videoThumbnail =
    media?.type === "video"
      ? `https://image.mux.com/${media.playbackId}/thumbnail.png?width=500`
      : undefined

  const videoPlaybackUrl =
    media?.type === "video"
      ? `https://stream.mux.com/${media.playbackId}.m3u8`
      : undefined

  return (
    <Tailwind>
      <div className="font-mono">
        <h1 className="text-2xl font-bold">une.haus feedback</h1>
        <p className="text-sm text-gray-600">
          from: {userName} ({userEmail})
        </p>
        <hr className="my-4" />
        <p className="whitespace-pre-wrap">{content}</p>
        {imageUrl && (
          <div className="mt-4">
            <p className="text-sm font-bold">attached image:</p>
            <img
              src={imageUrl}
              alt="Feedback attachment"
              className="mt-2 rounded"
              style={{ maxWidth: "500px" }}
            />
          </div>
        )}
        {videoThumbnail && videoPlaybackUrl && media?.type === "video" && (
          <div className="mt-4">
            <p className="text-sm font-bold">attached video:</p>
            <img
              src={videoThumbnail}
              alt="Video thumbnail"
              className="mt-2 rounded"
              style={{ maxWidth: "500px" }}
            />
            <p className="mt-2 text-xs text-gray-500">
              <a href={videoPlaybackUrl} className="text-blue-600 underline">
                {videoPlaybackUrl}
              </a>
            </p>
          </div>
        )}
      </div>
    </Tailwind>
  )
}
