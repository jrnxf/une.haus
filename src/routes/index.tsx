import { createFileRoute } from "@tanstack/react-router";

import { Logo } from "~/components/logo";
import { UsersDropdownMenu } from "~/components/users-dropdown-menu";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="grid grow place-items-center">
      <div className="w-[min(80vw,300px)]">
        <Logo className="size-full" />
      </div>
    </div>
  );
}
