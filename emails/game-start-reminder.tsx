import { Tailwind } from "@react-email/components"

type GameStartReminderTemplateProps = {
  userName: string
  hoursUntilStart: number
  riderCount: number
  setCount: number
  viewRoundUrl: string
  addSetUrl: string
  unsubscribeReminderUrl: string
  unsubscribeAllUrl: string
}

export default function GameStartReminderTemplate({
  userName = "User",
  hoursUntilStart = 24,
  riderCount = 0,
  setCount = 0,
  viewRoundUrl = "#",
  addSetUrl = "#",
  unsubscribeReminderUrl = "#",
  unsubscribeAllUrl = "#",
}: GameStartReminderTemplateProps) {
  const isLowParticipation = riderCount < 3

  const getParticipationMessage = () => {
    if (riderCount === 0) {
      return "no one has submitted sets yet—be the first to get the game started."
    }
    if (riderCount === 1) {
      return `only 1 rider has submitted a set so far. add yours to get the competition going.`
    }
    if (riderCount === 2) {
      return `only 2 riders have submitted sets so far. jump in and add yours to round out the competition.`
    }
    return `this week's round has ${setCount} ${setCount === 1 ? "set" : "sets"} from ${riderCount} ${riderCount === 1 ? "rider" : "riders"} ready to challenge you.`
  }

  const ctaUrl = isLowParticipation ? addSetUrl : viewRoundUrl
  const ctaText = isLowParticipation ? "add your set" : "view upcoming round"

  return (
    <Tailwind>
      <div className="mx-auto max-w-lg font-sans">
        <h1 className="mb-1 text-2xl font-bold">une.haus</h1>
        <p className="mb-6 text-gray-600">new RIU round starts tomorrow</p>

        <p className="mb-4">hey {userName},</p>

        <p className="mb-4">
          the next RIU round kicks off in{" "}
          <strong>
            {hoursUntilStart} {hoursUntilStart === 1 ? "hour" : "hours"}
          </strong>
          .
        </p>

        <p className="mb-6">{getParticipationMessage()}</p>

        <div className="my-6">
          <a
            href={ctaUrl}
            className="inline-block rounded bg-black px-4 py-2 text-white no-underline"
          >
            {ctaText}
          </a>
        </div>

        {!isLowParticipation && (
          <p className="mb-6 text-sm text-gray-600">
            quick refresher: each set you land earns you 3 points. each set you
            submit earns you 1 point. good luck!
          </p>
        )}

        <hr className="my-6 border-gray-200" />

        <p className="text-xs text-gray-500">
          <a href={unsubscribeReminderUrl} className="text-gray-500 underline">
            unsubscribe from game reminders
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
