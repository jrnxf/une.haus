import { Tailwind } from "@react-email/components"

type UserSet = {
  name: string
  instructions?: string
}

type PreGameTrickReminderTemplateProps = {
  userName: string
  sets: UserSet[]
  reviewSetsUrl: string
  unsubscribeReminderUrl: string
  unsubscribeAllUrl: string
}

export default function PreGameTrickReminderTemplate({
  userName = "User",
  sets = [],
  reviewSetsUrl = "#",
  unsubscribeReminderUrl = "#",
  unsubscribeAllUrl = "#",
}: PreGameTrickReminderTemplateProps) {
  if (sets.length === 0) {
    return null
  }

  const setCount = sets.length
  const subjectLine =
    setCount === 1
      ? "your set goes live tomorrow"
      : `your ${setCount} sets go live tomorrow`

  return (
    <Tailwind>
      <div className="mx-auto max-w-lg font-sans">
        <h1 className="mb-1 text-2xl font-bold">une.haus</h1>
        <p className="mb-6 text-gray-600">{subjectLine}</p>

        <p className="mb-4">hey {userName},</p>

        <p className="mb-6">
          the round starts tomorrow and you have{" "}
          <strong>
            {setCount} {setCount === 1 ? "set" : "sets"}
          </strong>{" "}
          lined up:
        </p>

        {sets.map((set, index) => (
          <div key={index} className="mb-4 rounded border border-gray-200 p-4">
            <p className="mb-1 font-bold">
              {setCount > 1 ? `${index + 1}. ` : ""}
              {set.name}
            </p>
            {set.instructions && (
              <p className="text-sm text-gray-600">"{set.instructions}"</p>
            )}
          </div>
        ))}

        <p className="mb-6 text-gray-600">
          make sure your {setCount === 1 ? "video is" : "videos are"} uploaded
          and your instructions are clear.
        </p>

        <div className="my-6">
          <a
            href={reviewSetsUrl}
            className="inline-block rounded bg-black px-4 py-2 text-white no-underline"
          >
            review your {setCount === 1 ? "set" : "sets"}
          </a>
        </div>

        <hr className="my-6 border-gray-200" />

        <p className="text-xs text-gray-500">
          <a href={unsubscribeReminderUrl} className="text-gray-500 underline">
            unsubscribe from trick reminders
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
