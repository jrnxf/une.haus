import { useEffect, useState } from "react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "~/components/ui/carousel";
import { VideoPlayer } from "~/components/video-player";
import { cn } from "~/lib/utils";
import type { TrickVideo } from "~/lib/tricks/types";

type VideoCarouselProps = {
  videos: TrickVideo[];
  className?: string;
};

export function VideoCarousel({ videos, className }: VideoCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (videos.length === 0) {
    return null;
  }

  const activeVideo = videos[current];

  return (
    <div className={cn("space-y-2", className)}>
      <Carousel setApi={setApi} opts={{ loop: true }} className="w-full">
        <CarouselContent>
          {videos.map((video) => (
            <CarouselItem key={video.id}>
              <VideoPlayer playbackId={video.playbackId} />
            </CarouselItem>
          ))}
        </CarouselContent>
        {videos.length > 1 && (
          <>
            <CarouselPrevious className="-left-3 bg-background/80" />
            <CarouselNext className="-right-3 bg-background/80" />
          </>
        )}
      </Carousel>

      {/* Video notes */}
      {activeVideo?.notes && (
        <p className="text-muted-foreground text-sm">{activeVideo.notes}</p>
      )}

      {/* Dot indicators */}
      {videos.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {videos.map((video, index) => (
            <button
              key={video.id}
              type="button"
              onClick={() => api?.scrollTo(index)}
              className={cn(
                "size-2 rounded-full transition-colors",
                index === current ? "bg-primary" : "bg-muted-foreground/30",
              )}
              aria-label={`Go to video ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
