import FeedbackTemplate from "../feedback";

export default function TextOnly() {
  return (
    <FeedbackTemplate
      userName="John Doe"
      userEmail="john@example.com"
      content="This is some sample feedback content for the preview. The app is great but I found a bug when trying to upload videos on mobile. The upload progress bar gets stuck at 50% and never completes."
      media={null}
    />
  );
}
