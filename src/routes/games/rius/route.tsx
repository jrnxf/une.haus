import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { RefreshCwIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useAdminRotateRius } from "~/lib/games/rius/hooks";
import { useIsAdmin } from "~/lib/session/hooks";

export const Route = createFileRoute("/games/rius")({
  component: RouteComponent,
});

function RouteComponent() {
  const location = useLocation();
  const isAdmin = useIsAdmin();
  const rotateRius = useAdminRotateRius();

  const isActive = (path: string) => location.pathname.includes(path);

  return (
    <div className="flex grow flex-col overflow-hidden px-1">
      <div className="overflow-y-auto" id="main-content">
        <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
          <Outlet />
          <div className="absolute top-2 right-2 flex gap-2">
            {isAdmin && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => rotateRius.mutate({})}
                disabled={rotateRius.isPending}
              >
                <RefreshCwIcon className="size-4" />
                Rotate
              </Button>
            )}
            <Button
              asChild
              variant={isActive("/previous") ? "default" : "outline"}
              size="sm"
            >
              <Link to="/games/rius/previous">Previous</Link>
            </Button>
            <Button
              asChild
              variant={isActive("/active") ? "default" : "outline"}
              size="sm"
            >
              <Link to="/games/rius/active">Active</Link>
            </Button>
            <Button
              asChild
              variant={isActive("/upcoming") ? "default" : "outline"}
              size="sm"
            >
              <Link to="/games/rius/upcoming">Upcoming</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
