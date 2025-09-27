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
    <div className="mx-auto flex w-full max-w-2xl grow overflow-hidden p-2">
      <ScrollArea className="w-full overflow-y-auto px-4" id="main-content">
        <div className="relative">
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
