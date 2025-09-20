import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { Button } from "~/components/ui/button";
import { useAdminRotateRius } from "~/lib/games/rius/hooks";

export const Route = createFileRoute("/games/rius")({
  component: RouteComponent,
});

function RouteComponent() {
  const rotateRius = useAdminRotateRius();

  return (
    <div
      className="relative mx-auto flex w-full max-w-5xl grow gap-4 p-4"
      id="main-content"
    >
      <aside className="sticky top-16 flex flex-col gap-2">
        <h2 className="text-muted-foreground text-xs font-semibold uppercase">
          Filters
        </h2>
        <Button asChild className="justify-start" variant="ghost">
          <Link to="/games/rius/active">Active</Link>
        </Button>
        <Button asChild className="justify-start" variant="ghost">
          <Link to="/games/rius/upcoming">Upcoming</Link>
        </Button>
        <Button asChild className="justify-start" variant="ghost">
          <Link to="/games/rius/previous">Previous</Link>
        </Button>
        {/* <Button
          className="justify-start"
          onClick={() => rotateRius.mutate({})}
          variant="ghost"
        >
          Rotate
        </Button> */}
      </aside>
      <div className="grow">
        <Outlet />
      </div>
    </div>
  );
}
