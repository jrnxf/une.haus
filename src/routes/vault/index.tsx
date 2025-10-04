import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MonitorIcon, TvIcon } from "lucide-react";
import { useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { getMuxPoster, VideoPlayer } from "~/components/video-player";
import { utv } from "~/lib/utv";
import { useFzf } from "~/lib/ux/hooks/use-fzf";

export const Route = createFileRoute("/vault/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(utv.all.queryOptions());
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = useSuspenseQuery(utv.all.queryOptions());
  const [query, setQuery] = useState("");

  const lowercasedQuery = query.toLowerCase();

  const fzf = useFzf([data, { selector: (video) => video.title }]);

  const filteredVault = fzf.find(lowercasedQuery);

  return (
    <div className="flex grow flex-col overflow-hidden px-1">
      <Accordion
        collapsible
        type="single"
        className="flex h-full grow flex-col"
      >
        <Input
          value={query}
          onChange={(evt) => setQuery(evt.target.value)}
          placeholder="Search vault"
          className="sticky top-0 m-3 mx-auto max-w-2xl shrink-0"
        />
        <ScrollArea
          className="h-full overflow-y-auto"
          id="main-content"
          virtualize
          viewportClassName="max-w-2xl mx-auto"
        >
          {filteredVault.map(({ item: video }) => (
            <AccordionItem
              value={String(video.id)}
              key={video.id}
              className="group mb-3 overflow-clip rounded-md border last:border-b"
            >
              <AccordionTrigger className="relative min-w-0 overflow-clip rounded-none py-0 pr-4 pl-0 hover:no-underline">
                <div className="flex min-h-12 w-full min-w-0 items-center gap-2 overflow-clip group-data-[state=open]:pl-4">
                  <div className="relative aspect-video h-16 overflow-clip transition-all group-data-[state=open]:hidden">
                    <img
                      src={getMuxPoster({
                        playbackId: video.playbackId,
                        time: 30, // 30 seconds into the video - usually enough to have the intro over
                        width: 104 * 2, // 104 is the width of the thumbnail + double for better quality
                      })}
                      alt={String(video.id)}
                      aria-label={video.title}
                      // className="scale-150" // hide the ugly yellow lol - might create a ui for scaling this and saving the results as well as scrubbing timestamps
                    />
                  </div>
                  <h2 className="truncate font-semibold">{video.title}</h2>
                  <div className="grow" />
                  <div className="flex shrink-0 gap-2">
                    <Button variant="secondary" asChild size="sm">
                      <a
                        href={`https://dashboard.mux.com/organizations/rm30mj/environments/62jevu/video/assets/${video.assetId}/monitor`}
                        target="_blank"
                      >
                        <MonitorIcon className="size-3" />
                        mux
                      </a>
                    </Button>
                    <Button variant="secondary" asChild size="sm">
                      <a href={video.legacyUrl} target="_blank">
                        <TvIcon className="size-3" />
                        utv
                      </a>
                    </Button>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="p-0">
                {video.playbackId ? (
                  <VideoPlayer
                    playbackId={video.playbackId}
                    className="rounded-none"
                  />
                ) : (
                  // TODO fix the types here
                  <p>No playback id</p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </ScrollArea>
      </Accordion>
    </div>
  );
}
