import { Tailwind } from "@react-email/components";

type GameStartReminderTemplateProps = {
  userName: string;
  hoursUntilStart: number;
  riderCount: number;
  setCount: number;
  viewRoundUrl: string;
  addSetUrl: string;
  unsubscribeReminderUrl: string;
  unsubscribeAllUrl: string;
};

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
  const isLowParticipation = riderCount < 3;

  const getParticipationMessage = () => {
    if (riderCount === 0) {
      return "No one has submitted sets yet—be the first to get the game started.";
    }
    if (riderCount === 1) {
      return `Only 1 rider has submitted a set so far. Add yours to get the competition going.`;
    }
    if (riderCount === 2) {
      return `Only 2 riders have submitted sets so far. Jump in and add yours to round out the competition.`;
    }
    return `This week's round has ${setCount} ${setCount === 1 ? "set" : "sets"} from ${riderCount} ${riderCount === 1 ? "rider" : "riders"} ready to challenge you.`;
  };

  const ctaUrl = isLowParticipation ? addSetUrl : viewRoundUrl;
  const ctaText = isLowParticipation ? "Add Your Set" : "View Upcoming Round";

  return (
    <Tailwind>
      <div className="mx-auto max-w-lg font-sans">
        <h1 className="mb-1 text-2xl font-bold">une.haus</h1>
        <p className="mb-6 text-gray-600">New RIU round starts tomorrow</p>

        <p className="mb-4">Hey {userName},</p>

        <p className="mb-4">
          The next RIU round kicks off in{" "}
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
            Quick refresher: Each set you land earns you 3 points. Each set you
            submit earns you 1 point. Good luck!
          </p>
        )}

        <hr className="my-6 border-gray-200" />

        <p className="text-xs text-gray-500">
          <a href={unsubscribeReminderUrl} className="text-gray-500 underline">
            Unsubscribe from game reminders
          </a>
          {" · "}
          <a href={unsubscribeAllUrl} className="text-gray-500 underline">
            Unsubscribe from all emails
          </a>
        </p>
      </div>
    </Tailwind>
  );
}
