import NotificationDigestTemplate from "../notification-digest"

export default function LikesOnly() {
  return (
    <NotificationDigestTemplate
      userName="John"
      groups={[
        {
          type: "likes",
          count: 5,
          items: [
            { title: "Your kickflip video" },
            { title: "Your heelflip combo" },
          ],
        },
      ]}
      unsubscribeDigestUrl="https://une.haus/unsubscribe?type=digest"
      unsubscribeAllUrl="https://une.haus/unsubscribe?type=all"
      viewNotificationsUrl="https://une.haus/notifications"
    />
  )
}
