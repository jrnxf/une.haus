import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { getMuxPoster } from "~/components/video-player";
import { games } from "~/lib/games";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/games/rius/active")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      games.rius.active.list.queryOptions(),
    );
  },
});

function RouteComponent() {
  const { data } = useSuspenseQuery(games.rius.active.list.queryOptions());

  if (!data?.sets.length) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Active RIUs</h1>
          <p className="text-muted-foreground mt-2">
            No active RIUs available.
          </p>
        </div>
      </div>
    );
  }

  // Group sets by user elegantly
  const groupedSets = useMemo(() => {
    const groups: Record<
      number,
      { user: (typeof data.sets)[0]["user"]; sets: typeof data.sets }
    > = {};

    for (const set of data.sets) {
      const userId = set.user.id;
      const existing = groups[userId];
      if (existing) {
        existing.sets.push(set);
      } else {
        groups[userId] = {
          user: set.user,
          sets: [set],
        };
      }
    }

    return groups;
  }, [data.sets]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <h1 className="text-2xl font-bold">Active RIUs</h1>

      <Accordion type="single" collapsible className="w-full rounded-lg border">
        {Object.entries(groupedSets).map(([userId, { user, sets }]) => (
          <AccordionItem
            key={userId}
            value={userId}
            className="border-b last:border-b-0"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <h2 className="font-semibold">{user.name}</h2>
            </AccordionTrigger>

            <AccordionContent className="px-4 pb-3">
              <Accordion
                type="single"
                collapsible
                className="rounded-md border"
              >
                {sets.map((set) => (
                  <AccordionItem
                    key={set.id}
                    value={set.id.toString()}
                    className="border-b last:border-b-0"
                  >
                    <AccordionTrigger className="px-3 py-2 hover:no-underline">
                      <div className="flex flex-col items-start">
                        <h3 className="text-sm font-medium">{set.name}</h3>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-3 pb-3">
                      <div className="space-y-2">
                        {set.video?.playbackId && (
                          <div className="aspect-video overflow-hidden rounded">
                            <img
                              alt=""
                              src={getMuxPoster(set.video.playbackId)}
                              className="h-full w-full object-contain"
                            />
                          </div>
                        )}
                        <Link
                          params={{ setId: set.id }}
                          to="/games/rius/sets/$setId"
                          className={cn(
                            "bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded px-3 py-1.5 text-xs font-medium",
                          )}
                        >
                          View Set
                        </Link>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
