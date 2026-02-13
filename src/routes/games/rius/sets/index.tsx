import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/games/rius/sets/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/games/rius/sets/"!</div>;
}
