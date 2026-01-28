import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  SplitIcon,
  TimerIcon,
  TrophyIcon,
} from "lucide-react";

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
          "group relative flex h-full flex-col overflow-hidden transition-all",
          "cursor-pointer border-dashed",
          "focus-within:scale-[1.01] hover:scale-[1.01]",
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center gap-4">
            <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
              <Icon className="size-4" />
            </div>
            <CardTitle className="text-lg">{name}</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="flex grow flex-col gap-4">
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
            <h1 className="text-2xl font-bold tracking-tight">Events</h1>
            <p className="text-muted-foreground text-sm">
              Tournament brackets and stopwatch tools for live events
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              name="Stopwatch"
              description="Full screen countdown timer with configurable time limit. Perfect for timed runs and competitions."
              href="/events/stopwatch/setup"
              icon={TimerIcon}
            />

            <FeatureCard
              name="Split"
              description="Two side-by-side stopwatches. Spacebar toggles between them for head-to-head battles."
              href="/events/stopwatch/split/setup"
              icon={SplitIcon}
            />

            <FeatureCard
              name="Bracket"
              description="Tournament bracket for any number of participants. Track matchups and advancement."
              href="/events/bracket/setup"
              icon={TrophyIcon}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
