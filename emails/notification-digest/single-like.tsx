import NotificationDigestTemplate from "../notification-digest";

export default function SingleLike() {
  return (
    <NotificationDigestTemplate
      userName="John"
      groups={[
        {
          type: "likes",
          count: 1,
          items: [{ title: "Your kickflip video" }],
        },
      ]}
      unsubscribeDigestUrl="https://une.haus/unsubscribe?type=digest"
      unsubscribeAllUrl="https://une.haus/unsubscribe?type=all"
      viewNotificationsUrl="https://une.haus/notifications"
    />
  );
}
