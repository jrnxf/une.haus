import { createFileRoute } from "@tanstack/react-router";

import { UnicycleGame } from "~/components/unicycle-game";

export const Route = createFileRoute("/arcade")({
  component: RouteComponent,
});

function RouteComponent() {
  return <UnicycleGame />;
}
