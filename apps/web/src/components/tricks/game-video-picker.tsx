import { useDeferredValue, useMemo, useState } from "react"

import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import { Input } from "~/components/ui/input"
import { VideoPlayer } from "~/components/video-player"

import type { GameVideoOption } from "~/lib/tricks"

// Tolerant match: "tiger-flip" finds "tiger flip" and vice versa
const strip = (s: string) => s.toLowerCase().replaceAll(/[^a-z0-9]/g, "")

// Players are heavy — start with one grid's worth and grow on demand
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
  // Typing stays snappy: the input tracks `query` directly while the grid of
  // players re-renders against the deferred value when React is idle
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
                <VideoPlayer
                  playbackId={video.playbackId}
                  className="h-full w-full rounded-none"
                />
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
    </div>
  )
}
