import GameStartReminderTemplate from "../game-start-reminder"

export default function OneHourLeft() {
  return (
    <GameStartReminderTemplate
      userName="John"
      hoursUntilStart={1}
      riderCount={5}
      setCount={8}
      viewRoundUrl="https://une.haus/games/rius"
      addSetUrl="https://une.haus/games/rius/sets/create"
      unsubscribeReminderUrl="https://une.haus/unsubscribe?type=game-reminder"
      unsubscribeAllUrl="https://une.haus/unsubscribe?type=all"
    />
  )
}
