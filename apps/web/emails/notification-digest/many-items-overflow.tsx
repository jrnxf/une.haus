import NotificationDigestTemplate from "../notification-digest"

export default function ManyItemsOverflow() {
  return (
    <NotificationDigestTemplate
      userName="John"
      frequency="weekly"
      groups={[
        {
          type: "likes",
          count: 15,
          items: [
            { title: "Your kickflip video" },
            { title: "Your heelflip combo" },
            { title: "Comment on flatground tricks" },
            { title: "Your tre flip clip" },
            { title: "Your varial flip" },
            { title: "Your nollie flip" },
            { title: "Your switch flip" },
            { title: "Your fakie flip" },
          ],
        },
        {
          type: "comments",
          count: 8,
          items: [
            { title: "Mike on your kickflip", preview: "That was sick!" },
            { title: "Sarah on your heelflip", preview: "Clean catch" },
            { title: "Alex on your tre flip", preview: "How many tries?" },
            { title: "Jordan on your combo", preview: "Insane line" },
            { title: "Chris on your varial", preview: "Steez" },
            { title: "Pat on your nollie", preview: "So good" },
          ],
        },
      ]}
      unsubscribeDigestUrl="https://une.haus/api/unsubscribe?type=digest"
      unsubscribeAllUrl="https://une.haus/api/unsubscribe?type=all"
      viewNotificationsUrl="https://une.haus/notifications"
    />
  )
}
