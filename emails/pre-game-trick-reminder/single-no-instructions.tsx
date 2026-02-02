import PreGameTrickReminderTemplate from "../pre-game-trick-reminder";

export default function SingleNoInstructions() {
  return (
    <PreGameTrickReminderTemplate
      userName="John"
      sets={[{ name: "Kickflip variations" }]}
      reviewSetsUrl="https://une.haus/games/rius/sets"
      unsubscribeReminderUrl="https://une.haus/unsubscribe?type=trick-reminder"
      unsubscribeAllUrl="https://une.haus/unsubscribe?type=all"
    />
  );
}
