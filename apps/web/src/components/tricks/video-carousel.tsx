import { Link } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { RichText } from "~/components/rich-text"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "~/components/ui/carousel"
import { VideoPlayer } from "~/components/video-player"
import { cn } from "~/lib/utils"

type CarouselVideo = {
  id: number
  playbackId: string
  notes: string | null
  submittedBy?: {
    id: number
    name: string
    avatarId: string | null
  } | null
}

type VideoCarouselProps = {
  videos: CarouselVideo[]
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

      {/* Uploader attribution + dot indicators */}
      {(activeVideo?.submittedBy || videos.length > 1) && (
        <div className="flex items-center gap-2">
          {activeVideo?.submittedBy && (
            <Link
              to="/users/$userId"
              params={{ userId: activeVideo.submittedBy.id }}
              className="flex min-w-0 items-center gap-2"
            >
              <Avatar
                cloudflareId={activeVideo.submittedBy.avatarId}
                alt={activeVideo.submittedBy.name}
                className="size-5"
              >
                <AvatarImage width={40} quality={70} />
                <AvatarFallback name={activeVideo.submittedBy.name} />
              </Avatar>
              <span className="truncate text-sm underline underline-offset-4">
                {activeVideo.submittedBy.name}
              </span>
            </Link>
          )}
          {videos.length > 1 && (
            <div className="ml-auto flex gap-1.5">
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
      )}

      {/* Video notes */}
      {activeVideo?.notes && (
        <RichText
          content={activeVideo.notes}
          className="text-muted-foreground text-sm"
        />
      )}
    </div>
  )
}
