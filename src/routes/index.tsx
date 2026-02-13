import { createFileRoute } from "@tanstack/react-router";

import { LogoRandomScatter } from "~/components/logo-animated";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <LogoRandomScatter className="h-auto w-full max-w-sm" />
    </div>
  );
}
