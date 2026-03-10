import NotificationDigestTemplate from "../notification-digest"

export default function FollowersOnly() {
  return (
    <NotificationDigestTemplate
      userName="John"
      frequency="weekly"
      groups={[
        {
          type: "followers",
          count: 3,
          items: [
            { title: "Mike Smith" },
            { title: "Sarah Jones" },
            { title: "Alex Chen" },
          ],
        },
      ]}
      unsubscribeDigestUrl="https://une.haus/unsubscribe?type=digest"
      unsubscribeAllUrl="https://une.haus/unsubscribe?type=all"
      viewNotificationsUrl="https://une.haus/notifications"
    />
  )
}
