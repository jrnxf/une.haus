import FeedbackTemplate from "../feedback"

export default function WithImage() {
  return (
    <FeedbackTemplate
      userName="Sarah Smith"
      userEmail="sarah@example.com"
      content="Here's a screenshot showing the issue I mentioned. The button is cut off on the right side of the screen."
      media={{
        type: "image",
        value: "sample-image-id",
      }}
    />
  )
}
