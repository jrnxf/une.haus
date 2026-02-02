import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRightIcon, TimerIcon, TrophyIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/events/")({
  component: RouteComponent,
});

type FeatureCardProps = {
  name: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

function FeatureCard({ name, description, href, icon: Icon }: FeatureCardProps) {
  return (
    <Link to={href} className="block h-full">
      <Card
        className={cn(
          "group relative flex h-full flex-col overflow-hidden transition-all py-4 gap-2",
          "cursor-pointer",
          "focus-within:scale-[1.01] hover:scale-[1.01]",
        )}
      >
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
              <Icon className="size-3.5" />
            </div>
            <CardTitle className="text-base">{name}</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="flex grow flex-col gap-2">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>

          <div className="mt-auto flex items-center justify-end">
            <span className="text-muted-foreground group-hover:text-foreground flex items-center gap-1 text-sm transition-colors">
              Open
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function RouteComponent() {
  return (
    <div className="flex grow flex-col overflow-hidden">
      <div className="overflow-y-auto" id="main-content">
        <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
          <div className="mb-8 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">events</h1>
            <p className="text-muted-foreground text-sm">
              tournament brackets and stopwatch tools for live events
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FeatureCard
              name="stopwatch"
              description="full screen countdown timer with configurable time limit. perfect for timed runs and competitions."
              href="/events/stopwatch/setup"
              icon={TimerIcon}
            />

            <FeatureCard
              name="bracket"
              description="tournament bracket for any number of participants. track matchups and advancement with built-in split timers."
              href="/events/bracket/setup"
              icon={TrophyIcon}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
