import { createFileRoute } from "@tanstack/react-router";
import { TimerIcon, TrophyIcon } from "lucide-react";

import { LinkCard } from "~/components/link-card";
import { PageHeader } from "~/components/page-header";

export const Route = createFileRoute("/events/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>events</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
            <LinkCard.Root href="/events/stopwatch/setup">
              <LinkCard.Header icon={TimerIcon} title="stopwatch" />
              <LinkCard.Content>
                <LinkCard.Description>
                  full screen countdown timer with configurable time limit.
                  perfect for timed runs and competitions.
                </LinkCard.Description>
                <LinkCard.Cta label="Open" />
              </LinkCard.Content>
            </LinkCard.Root>

            <LinkCard.Root href="/events/bracket/setup">
              <LinkCard.Header icon={TrophyIcon} title="bracket" />
              <LinkCard.Content>
                <LinkCard.Description>
                  tournament bracket for any number of participants. track
                  matchups and advancement with built-in split timers.
                </LinkCard.Description>
                <LinkCard.Cta label="Open" />
              </LinkCard.Content>
            </LinkCard.Root>
        </div>
      </div>
    </>
  );
}
