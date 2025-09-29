import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";

import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";

export const Route = createFileRoute("/games/rius")({
  component: RouteComponent,
});

function RouteComponent() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname.includes(path);

  return (
    <div className="flex grow flex-col overflow-hidden px-1">
      <ScrollArea className="overflow-y-auto" id="main-content">
        <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
          <Outlet />
          <div className="absolute top-0 right-0 flex gap-2">
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
      </ScrollArea>
    </div>
  );
}
