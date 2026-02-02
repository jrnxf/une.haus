import PreGameTrickReminderTemplate from "../pre-game-trick-reminder";

export default function MultipleSets() {
  return (
    <PreGameTrickReminderTemplate
      userName="John"
      sets={[
        { name: "Kickflip variations", instructions: "Land it clean, no sketchy landings" },
        { name: "Flatground combos", instructions: "Any 3-trick combo" },
        { name: "Manual tricks" },
      ]}
      reviewSetsUrl="https://une.haus/games/rius/sets"
      unsubscribeReminderUrl="https://une.haus/unsubscribe?type=trick-reminder"
      unsubscribeAllUrl="https://une.haus/unsubscribe?type=all"
    />
  );
}
