import GameStartReminderTemplate from "../game-start-reminder"

export default function TwoRiders() {
  return (
    <GameStartReminderTemplate
      userName="John"
      hoursUntilStart={24}
      riderCount={2}
      setCount={3}
      viewRoundUrl="https://une.haus/games/rius"
      addSetUrl="https://une.haus/games/rius/sets/create"
      unsubscribeReminderUrl="https://une.haus/unsubscribe?type=game-reminder"
      unsubscribeAllUrl="https://une.haus/unsubscribe?type=all"
    />
  )
}
