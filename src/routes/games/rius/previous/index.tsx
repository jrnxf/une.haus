import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ScrollArea } from "~/components/ui/scroll-area";
import { VideoPlayer } from "~/components/video-player";
import { games } from "~/lib/games";
import { cn } from "~/lib/utils";

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

  if (archivedRius.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Previous RIUs</h1>
          <p className="text-muted-foreground mt-2">
            No previous RIUs available yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Previous RIUs</h1>

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
            <ScrollArea className="max-h-[400px] min-w-[250px] overflow-y-auto">
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
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {selectedRiu && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold">RIU #{selectedRiu.id}</h2>
              <p className="text-muted-foreground text-sm">
                {formatRiuDate(selectedRiu.createdAt)} •{" "}
                {selectedRiu.sets.length} sets
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {selectedRiu.sets.map((set) => (
              <div
                key={set.id}
                className={cn(
                  "w-full space-y-3 rounded-md border bg-white p-3 text-left dark:bg-[#0a0a0a]",
                )}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="size-6 rounded-full">
                    <AvatarImage
                      alt={set.user.name}
                      src={set.user.avatarUrl || undefined}
                    />
                    <AvatarFallback className="text-xs" name={set.user.name} />
                  </Avatar>
                  <p className="truncate text-base font-medium">{set.name}</p>
                </div>

                {set.description && (
                  <p className="text-muted-foreground line-clamp-3 text-sm">
                    {set.description}
                  </p>
                )}

                {set.video?.playbackId && (
                  <VideoPlayer playbackId={set.video.playbackId} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
