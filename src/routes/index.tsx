import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";

import { LogoRandomScatter } from "~/components/logo-animated";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

const sections = [
  { to: "/tricks", label: "tricks", desc: "explore the trick graph" },
  { to: "/games", label: "games", desc: "play games of skate" },
  { to: "/vault", label: "vault", desc: "browse video clips" },
  { to: "/posts", label: "posts", desc: "community discussions" },
  { to: "/users", label: "users", desc: "find skaters" },
  { to: "/map", label: "map", desc: "discover spots" },
  { to: "/stats", label: "stats", desc: "community activity" },
  { to: "/events", label: "events", desc: "tournaments" },
] as const;

function RouteComponent() {
  return (
    <div className="flex flex-col items-center justify-start gap-6 px-4 py-6">
      <LogoRandomScatter />
      <div className="bg-card w-96 divide-y rounded-xl border">
        {sections.map((section) => (
          <Link
            key={section.to}
            to={section.to}
            className="hover:bg-muted/50 flex items-center justify-between p-4 transition-colors first:rounded-t-xl last:rounded-b-xl"
          >
            <div>
              <p className="font-medium">{section.label}</p>
              <p className="text-muted-foreground text-xs">{section.desc}</p>
            </div>
            <ChevronRightIcon className="text-muted-foreground size-4" />
          </Link>
        ))}
      </div>
    </div>
  );
}
