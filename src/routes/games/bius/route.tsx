import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { ArrowLeftIcon, RotateCcwIcon } from "lucide-react";

import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/games/bius")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex grow flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground -ml-2 gap-1.5"
            asChild
          >
            <Link to="/games">
              <ArrowLeftIcon className="size-4" />
              Games
            </Link>
          </Button>
          <div className="bg-border h-4 w-px" />
          <div className="flex items-center gap-2">
            <div className="bg-muted text-muted-foreground flex size-6 items-center justify-center rounded-md">
              <RotateCcwIcon className="size-3.5" />
            </div>
            <h1 className="text-sm font-semibold">Back It Up</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" id="main-content">
        <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
