import { createFileRoute, Link } from "@tanstack/react-router";

import { Logo } from "~/components/logo";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="grid grow place-items-center">
      <div className="w-[min(80vw,300px)]">
        <Logo className="size-full" />
        <Link to="/users/$userId" params={{ userId: 10_000 }}>
          User 1000
        </Link>
      </div>
    </div>
  );
}
