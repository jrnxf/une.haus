import NotificationDigestTemplate from "../notification-digest"

export default function CommentsOnly() {
  return (
    <NotificationDigestTemplate
      userName="John"
      groups={[
        {
          type: "comments",
          count: 4,
          items: [
            { title: "Mike on your kickflip", preview: "That was sick!" },
            { title: "Sarah on your heelflip", preview: "Clean catch" },
            { title: "Alex on your tre flip", preview: "How many tries?" },
            { title: "Jordan on your combo", preview: "Insane line" },
          ],
        },
      ]}
      unsubscribeDigestUrl="https://une.haus/unsubscribe?type=digest"
      unsubscribeAllUrl="https://une.haus/unsubscribe?type=all"
      viewNotificationsUrl="https://une.haus/notifications"
    />
  )
}
