import { createFileRoute } from "@tanstack/react-router";

import { Logo } from "~/components/logo";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="grid size-full place-items-center">
      <div className="space-y-4 p-4">
        <Logo className="h-14" />
      </div>
    </div>
  );
}
