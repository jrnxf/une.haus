import { createFileRoute } from "@tanstack/react-router";

import { LogoOptionC } from "~/components/logo-option-c";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="grid h-full place-items-center">
      <div className="w-[min(80vw,270px)]">
        <LogoOptionC />
      </div>
    </div>
  );
}
