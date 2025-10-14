import { createFileRoute } from "@tanstack/react-router";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

import { Logo } from "~/components/logo";
import { Button } from "~/components/ui/button";
import { ButtonGroup } from "~/components/ui/button-group";
import { useTheme } from "~/lib/theme/context";

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
