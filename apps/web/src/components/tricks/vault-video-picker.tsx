import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"
import { getMuxPoster } from "~/components/video-player"

import type { VaultVideoOption } from "~/lib/tricks"

function formatDuration(seconds: number) {
  const total = Math.round(seconds)
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${minutes}:${String(rest).padStart(2, "0")}`
}

type VaultVideoPickerProps = {
  videos: VaultVideoOption[]
  value: string | null
  onChange: (muxAssetId: string) => void
}

export function VaultVideoPicker({
  videos,
  value,
  onChange,
}: VaultVideoPickerProps) {
  return (
    <RadioGroup
      aria-label="vault videos"
      value={value ?? ""}
      onValueChange={(next) => {
        if (typeof next === "string" && next) onChange(next)
      }}
      className="gap-2"
    >
      {videos.map((video) => (
        <label
          key={video.utvVideoId}
          className="hover:bg-accent/50 has-data-checked:border-primary flex cursor-pointer items-center gap-3 rounded-md border p-2"
        >
          <RadioGroupItem value={video.muxAssetId} />
          <img
            src={getMuxPoster({
              playbackId: video.playbackId,
              width: 160,
              time: video.thumbnailSeconds,
            })}
            alt=""
            loading="lazy"
            className="aspect-video w-24 shrink-0 rounded-sm bg-black object-cover"
          />
          <span className="min-w-0 flex-1 truncate text-sm">{video.title}</span>
          {video.durationSeconds !== null && (
            <span className="text-muted-foreground text-xs tabular-nums">
              {formatDuration(video.durationSeconds)}
            </span>
          )}
        </label>
      ))}
    </RadioGroup>
  )
}
