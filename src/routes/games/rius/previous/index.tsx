import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronDown,
  CornerDownLeftIcon,
  HeartIcon,
  MessageCircleIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { VideoPlayer } from "~/components/video-player";
import { games, groupSetsByUser } from "~/lib/games";

const formatRiuDate = (createdAt: Date | string) => {
  const date = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const Route = createFileRoute("/games/rius/previous/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      games.rius.archived.list.queryOptions(),
    );
  },
});

function RouteComponent() {
  const { data: archivedRius } = useSuspenseQuery(
    games.rius.archived.list.queryOptions(),
  );

  const [selectedRiuId, setSelectedRiuId] = useState<number | null>(
    archivedRius.length > 0 ? archivedRius[0].id : null,
  );

  const selectedRiu = archivedRius.find((riu) => riu.id === selectedRiuId);

  // Group sets by user elegantly
  const groupedSets = useMemo(() => {
    if (!selectedRiu) return {};
    return groupSetsByUser(selectedRiu.sets);
  }, [selectedRiu]);

  if (archivedRius.length === 0) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">No previous RIUs available yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Previous RIUs</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[200px] justify-between">
              {selectedRiu ? (
                <span>
                  RIU #{selectedRiu.id} - {formatRiuDate(selectedRiu.createdAt)}
                </span>
              ) : (
                "Select a RIU"
              )}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="h-[400px] min-w-[250px]">
              {archivedRius.map((riu) => (
                <DropdownMenuItem
                  key={riu.id}
                  onSelect={() => setSelectedRiuId(riu.id)}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">RIU #{riu.id}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatRiuDate(riu.createdAt)} • {riu.sets.length} sets
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {selectedRiu && Object.keys(groupedSets).length > 0 && (
        <Accordion
          type="single"
          collapsible
          className="w-full rounded-lg border"
        >
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
                  defaultValue={sets[0]?.id.toString()}
                >
                  {sets.map((set) => (
                    <AccordionItem
                      key={set.id}
                      value={set.id.toString()}
                      className="border-b last:border-b-0"
                    >
                      <AccordionTrigger className="px-3 py-2 hover:no-underline">
                        <div className="flex w-full items-center justify-between pr-4">
                          <h3 className="text-sm font-medium">{set.name}</h3>
                          <div className="text-muted-foreground flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1">
                              <MessageCircleIcon className="size-3" />
                              <span>0</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <HeartIcon className="size-3" />
                              <span>0</span>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="px-3 pb-3">
                        <div className="space-y-4">
                          {/* Video player */}
                          {set.video?.playbackId && (
                            <VideoPlayer playbackId={set.video.playbackId} />
                          )}

                          {/* Instructions below video */}
                          {set.instructions && (
                            <p className="text-muted-foreground text-xs">
                              {set.instructions}
                            </p>
                          )}

                          {/* Message form */}
                          <form className="bg-background focus-within:ring-ring border-input relative w-full overflow-clip rounded-md border px-2 focus-within:ring-2">
                            <div className="flex items-center gap-2">
                              <Input
                                className="h-9 border-0 px-1 shadow-none focus-visible:ring-0"
                                placeholder="Quick message..."
                              />
                              <Button
                                iconRight={
                                  <CornerDownLeftIcon className="size-3" />
                                }
                                size="sm"
                                type="submit"
                                variant="secondary"
                              />
                            </div>
                          </form>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
