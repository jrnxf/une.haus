import { PlayIcon } from "lucide-react"
import { useDeferredValue, useMemo, useState } from "react"

import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { getMuxPoster, VideoPlayer } from "~/components/video-player"

import type { GameVideoOption } from "~/lib/tricks"

// Tolerant match: "tiger-flip" finds "tiger flip" and vice versa
const strip = (s: string) => s.toLowerCase().replaceAll(/[^a-z0-9]/g, "")

const PAGE_SIZE = 6

type GameVideoPickerProps = {
  videos: GameVideoOption[]
  value: string | null
  onChange: (muxAssetId: string | null) => void
  // Initial search — the trick being landed, so relevant footage shows first
  defaultQuery: string
}

export function GameVideoPicker({
  videos,
  value,
  onChange,
  defaultQuery,
}: GameVideoPickerProps) {
  const [query, setQuery] = useState(defaultQuery)
  const [limit, setLimit] = useState(PAGE_SIZE)
  // The clip being previewed in the dialog, if any
  const [preview, setPreview] = useState<GameVideoOption | null>(null)
  // Typing stays snappy: the input tracks `query` directly while the grid
  // re-renders against the deferred value when React is idle
  const deferredQuery = useDeferredValue(query)

  const q = strip(deferredQuery)
  // Results are search-gated: an empty query shows nothing rather than the
  // rider's entire game history
  const matches = useMemo(
    () => (q ? videos.filter((v) => strip(v.label).includes(q)) : []),
    [videos, q],
  )

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setLimit(PAGE_SIZE)
        }}
        aria-label="search game videos"
        placeholder="search your sets and submissions..."
      />

      {q === "" ? (
        <p className="text-muted-foreground text-sm">
          search your game footage by trick name
        </p>
      ) : matches.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          no sets or submissions match &ldquo;{deferredQuery}&rdquo;
        </p>
      ) : (
        <div className="@container space-y-4">
          <div className="grid grid-cols-2 gap-4 @2xl:grid-cols-3">
            {matches.slice(0, limit).map((video) => (
              <div
                key={video.id}
                className="relative aspect-video overflow-clip rounded-md bg-black"
              >
                {/* Poster opens the preview dialog; the footer bar below is a
                    sibling so selecting never triggers playback */}
                <button
                  type="button"
                  onClick={() => setPreview(video)}
                  aria-label={`play ${video.label}`}
                  className="group absolute inset-0 cursor-pointer"
                >
                  <img
                    src={getMuxPoster({
                      playbackId: video.playbackId,
                      width: 640,
                    })}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex size-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-xs transition-transform group-hover:scale-110">
                      <PlayIcon className="size-4 fill-white text-white" />
                    </span>
                  </span>
                </button>
                {/* Blurred title bar (vault style) carrying the select checkbox */}
                <label className="absolute inset-x-0 bottom-0 z-10 flex cursor-pointer items-center gap-2 rounded-b-md bg-black/60 px-2 py-1.5 backdrop-blur-xs">
                  <Checkbox
                    checked={value === video.muxAssetId}
                    onCheckedChange={(checked) =>
                      onChange(checked === true ? video.muxAssetId : null)
                    }
                    aria-label={`select ${video.label}`}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">
                    {video.label}
                  </span>
                  <span className="shrink-0 text-xs text-white/70">
                    {video.kind === "submission"
                      ? `${video.game} submission`
                      : video.game}
                  </span>
                </label>
              </div>
            ))}
          </div>
          {matches.length > limit && (
            <Button
              variant="outline"
              onClick={() => setLimit((current) => current + PAGE_SIZE)}
            >
              more
            </Button>
          )}
        </div>
      )}

      <Dialog
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
      >
        <DialogContent className="gap-2 p-2 sm:max-w-3xl">
          <DialogTitle className="sr-only">
            {preview ? preview.label : "video preview"}
          </DialogTitle>
          {preview && (
            <VideoPlayer
              autoPlay
              playbackId={preview.playbackId}
              className="w-full rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
