import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MonitorIcon, TvIcon } from "lucide-react";
import { useRef, useState } from "react";

import { Virtualizer } from "virtua";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
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

  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="h-full overflow-y-auto" ref={scrollRef}>
      <div className="mx-auto grid max-w-4xl grid-cols-1 grid-rows-[auto_1fr] p-4">
        <Input
          id="vault-search"
          value={query}
          onChange={(evt) => setQuery(evt.target.value)}
          placeholder="Search vault"
          className="mx-auto max-w-2xl"
        />
        <Accordion collapsible type="single">
          <Virtualizer
            scrollRef={scrollRef}
            overscan={12}
            startMargin={
              // math to properly virtualize without this, the top element will
              // disappear before it has actually been scrolled out of view
              44 + // input height
              16 + // layout padding
              12 // first accordion item top margin
            }
          >
            {filteredVault.map(({ item: video }) => (
              <AccordionItem
                value={String(video.id)}
                key={video.id}
                className="group mt-3 overflow-clip rounded-md border last:border-b"
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
          </Virtualizer>
        </Accordion>
      </div>
    </div>
  );
}
