import { createFileRoute } from "@tanstack/react-router";

import { LogoRandomScatter } from "~/components/logo-animated";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="grid size-full place-items-center">
      <LogoRandomScatter />
    </div>
  );
}
