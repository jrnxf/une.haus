import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { HeartIcon, MessageCircleIcon, UploadIcon } from "lucide-react";
import { useMemo } from "react";

import { Tray, TrayContent, TrayTitle, TrayTrigger } from "~/components/tray";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { getMuxPoster, VideoPlayer } from "~/components/video-player";
import { Json } from "~/lib/dx/json";
import { games, groupSetsByUser } from "~/lib/games";
import { messages } from "~/lib/messages";
import { useCreateMessage } from "~/lib/messages/hooks";
import { type ServerFnReturn } from "~/lib/types";
import { MessagesView } from "~/views/messages";

export const Route = createFileRoute("/games/rius/active")({
  component: RouteComponent,
  loader: async ({ context }) => {
    const activeRiuData = await context.queryClient.ensureQueryData(
      games.rius.active.list.queryOptions(),
    );

    // Prefetch messages for all sets
    const messagePromises = activeRiuData.sets.map((set) =>
      context.queryClient.ensureQueryData(
        messages.list.queryOptions({ type: "riuSet", id: set.id }),
      ),
    );

    await Promise.all(messagePromises);
  },
});

type SetType = ServerFnReturn<typeof games.rius.active.list.fn>["sets"][number];

function SetCard({ set }: { set: SetType }) {
  const record = { type: "riuSet" as const, id: set.id };
  const messagesQuery = useSuspenseQuery(messages.list.queryOptions(record));
  const createMessage = useCreateMessage(record);

  return (
    <Tray>
      <TrayTrigger asChild>
        <Button
          variant="outline"
          className="h-auto w-full flex-col items-start justify-start gap-1 p-3 text-left whitespace-normal"
        >
          {/* Content */}
          <div className="flex w-full items-start justify-between gap-6">
            <h3 className="truncate text-sm font-medium">{set.name}</h3>
            {/* Stats */}
            <div className="text-muted-foreground flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <MessageCircleIcon className="size-3" />
                <span>{messagesQuery.data.messages.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <HeartIcon className="size-3" />
                <span>{set.likes.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <UploadIcon className="size-3" />
                <span>0</span>
              </div>
            </div>
          </div>

          {set.instructions && (
            <p className="text-muted-foreground line-clamp-2 overflow-hidden text-xs">
              {set.instructions}
            </p>
          )}
        </Button>
      </TrayTrigger>

      <TrayContent className="flex h-[90vh] max-h-[90vh] max-w-4xl flex-col">
        <TrayTitle>{set.name}</TrayTitle>

        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          {/* Video player */}
          {set.video?.playbackId && (
            <div className="shrink-0">
              <VideoPlayer playbackId={set.video.playbackId} />
            </div>
          )}

          {/* Instructions */}
          {set.instructions && (
            <p className="text-muted-foreground shrink-0 text-sm">
              {set.instructions}
            </p>
          )}

          {/* Messages */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <MessagesView
              record={record}
              messages={messagesQuery.data.messages}
              handleCreateMessage={(content) => createMessage.mutate(content)}
            />
          </div>
        </div>
      </TrayContent>
    </Tray>
  );
}

function RouteComponent() {
  const { data } = useSuspenseQuery(games.rius.active.list.queryOptions());

  if (!data?.sets.length) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">No active RIUs available.</p>
        <Json data={data} />
      </div>
    );
  }

  // Group sets by user elegantly
  const groupedSets = useMemo(() => groupSetsByUser(data.sets), [data.sets]);

  return (
    <div className="flex flex-col gap-8 p-4">
      <h2 className="text-lg font-semibold">RIU #{data.id}</h2>

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

            <AccordionContent className="border-t p-3">
              <div className="flex flex-col gap-3">
                {sets.map((set) => (
                  <SetCard key={set.id} set={set} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
