import FeedbackTemplate from "../feedback"

export default function WithVideo() {
  return (
    <FeedbackTemplate
      userName="Mike Johnson"
      userEmail="mike@example.com"
      content="I recorded a quick video showing the bug in action. Watch around the 0:15 mark to see where it breaks."
      media={{
        type: "video",
        assetId: "sample-asset-id",
        playbackId: "sample-playback-id",
      }}
    />
  )
}
