import PreGameTrickReminderTemplate from "../pre-game-trick-reminder"

export default function SingleSet() {
  return (
    <PreGameTrickReminderTemplate
      userName="John"
      sets={[
        {
          name: "Kickflip variations",
          instructions: "Land it clean, no sketchy landings",
        },
      ]}
      reviewSetsUrl="https://une.haus/games/rius/sets"
      unsubscribeReminderUrl="https://une.haus/unsubscribe?type=trick-reminder"
      unsubscribeAllUrl="https://une.haus/unsubscribe?type=all"
    />
  )
}
