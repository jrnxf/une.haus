import { useEffect, useState } from "react"

import { RichText } from "~/components/rich-text"
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "~/components/ui/carousel"
import { VideoPlayer } from "~/components/video-player"
import { type TrickVideo } from "~/lib/tricks/types"
import { cn } from "~/lib/utils"

type VideoCarouselProps = {
  videos: TrickVideo[]
  className?: string
}

export function VideoCarousel({ videos, className }: VideoCarouselProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!api) return

    const onSelect = () => setCurrent(api.selectedScrollSnap())
    onSelect()
    api.on("select", onSelect)

    return () => {
      api.off("select", onSelect)
    }
  }, [api])

  if (videos.length === 0) {
    return null
  }

  const activeVideo = videos[current]

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
            <CarouselPrevious className="bg-background/80 -left-3" />
            <CarouselNext className="bg-background/80 -right-3" />
          </>
        )}
      </Carousel>

      {/* Video notes */}
      {activeVideo?.notes && (
        <RichText
          content={activeVideo.notes}
          className="text-muted-foreground text-sm"
        />
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
  )
}
