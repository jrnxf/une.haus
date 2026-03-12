import NotificationDigestTemplate from "../notification-digest"

export default function SingleLike() {
  return (
    <NotificationDigestTemplate
      userName="John"
      frequency="weekly"
      groups={[
        {
          type: "likes",
          count: 1,
          items: [{ title: "Your kickflip video" }],
        },
      ]}
      unsubscribeDigestUrl="https://une.haus/api/unsubscribe?type=digest"
      unsubscribeAllUrl="https://une.haus/api/unsubscribe?type=all"
      viewNotificationsUrl="https://une.haus/notifications"
    />
  )
}
