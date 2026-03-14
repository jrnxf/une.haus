import { Tailwind } from "@react-email/components"

type NotificationGroup = {
  type: "likes" | "comments" | "followers"
  count: number
  items: Array<{
    title: string
    preview?: string
  }>
}

type NotificationDigestTemplateProps = {
  userName: string
  frequency: "weekly" | "monthly"
  groups: NotificationGroup[]
  unsubscribeDigestUrl: string
  unsubscribeAllUrl: string
  viewNotificationsUrl: string
}

function getGroupTitle(group: NotificationGroup) {
  switch (group.type) {
    case "likes":
      return `${group.count} ${group.count === 1 ? "like" : "likes"} on your content`
    case "comments":
      return `${group.count} ${group.count === 1 ? "comment" : "comments"}`
    case "followers":
      return `${group.count} new ${group.count === 1 ? "follower" : "followers"}`
  }
}

export default function NotificationDigestTemplate({
  userName = "User",
  frequency = "weekly",
  groups = [],
  unsubscribeDigestUrl = "#",
  unsubscribeAllUrl = "#",
  viewNotificationsUrl = "#",
}: NotificationDigestTemplateProps) {
  const hasContent = groups.length > 0

  if (!hasContent) {
    return null
  }

  const period = frequency === "monthly" ? "month" : "week"

  return (
    <Tailwind>
      <div className="mx-auto max-w-lg font-sans">
        <h1 className="mb-1 text-2xl font-bold">une.haus</h1>
        <p className="mb-6 text-gray-600">your {period} on une.haus</p>

        <p className="mb-4">hey {userName},</p>
        <p className="mb-6">here's what you missed this {period}:</p>

        {groups.map((group) => (
          <div key={group.type} className="mb-6">
            <p className="mb-2 font-bold">{getGroupTitle(group)}</p>
            <ul className="list-disc pl-5">
              {group.items.slice(0, 5).map((item, index) => (
                <li key={index} className="mb-1 text-gray-700">
                  {item.title}
                  {item.preview && (
                    <span className="text-gray-500"> - "{item.preview}"</span>
                  )}
                </li>
              ))}
              {group.items.length > 5 && (
                <li className="text-gray-500">
                  ...and {group.items.length - 5} more
                </li>
              )}
            </ul>
          </div>
        ))}

        <div className="my-6">
          <a
            href={viewNotificationsUrl}
            className="inline-block rounded bg-black px-4 py-2 text-white no-underline"
          >
            view all notifications
          </a>
        </div>

        <hr className="my-6 border-gray-200" />

        <p className="text-xs text-gray-500">
          <a href={unsubscribeDigestUrl} className="text-gray-500 underline">
            unsubscribe from digests
          </a>
          {" · "}
          <a href={unsubscribeAllUrl} className="text-gray-500 underline">
            unsubscribe from all emails
          </a>
        </p>
      </div>
    </Tailwind>
  )
}
