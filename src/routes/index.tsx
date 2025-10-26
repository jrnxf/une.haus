import { createFileRoute } from "@tanstack/react-router";

import { Logo } from "~/components/logo";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="grid h-full place-items-center">
      <div className="w-[min(80vw,300px)]">
        <Logo />
      </div>
    </div>
  );
}
