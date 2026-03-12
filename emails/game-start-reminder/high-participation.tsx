import GameStartReminderTemplate from "../game-start-reminder"

export default function HighParticipation() {
  return (
    <GameStartReminderTemplate
      userName="John"
      hoursUntilStart={24}
      riderCount={8}
      setCount={15}
      viewRoundUrl="https://une.haus/games/rius"
      addSetUrl="https://une.haus/games/rius/sets/create"
      unsubscribeReminderUrl="https://une.haus/api/unsubscribe?type=game_start"
      unsubscribeAllUrl="https://une.haus/api/unsubscribe?type=all"
    />
  )
}
