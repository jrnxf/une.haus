import GameStartReminderTemplate from "../game-start-reminder";

export default function NoRiders() {
  return (
    <GameStartReminderTemplate
      userName="John"
      hoursUntilStart={24}
      riderCount={0}
      setCount={0}
      viewRoundUrl="https://une.haus/games/rius"
      addSetUrl="https://une.haus/games/rius/sets/create"
      unsubscribeReminderUrl="https://une.haus/unsubscribe?type=game-reminder"
      unsubscribeAllUrl="https://une.haus/unsubscribe?type=all"
    />
  );
}
