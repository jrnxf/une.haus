import { Loader2Icon, TrashIcon } from "lucide-react"
import pluralize from "pluralize"
import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone-esm"

import { UploadDropZone } from "~/components/input/upload-drop-zone"
import { Button } from "~/components/ui/button"
import { Progress } from "~/components/ui/progress"
import { VideoPlayer } from "~/components/video-player"
import { useVideoUpload } from "~/lib/media"

type VideoItem = {
  assetId: string
  playbackId: string
}

type MultiVideoInputProps = {
  value: string[]
  onChange: (assetIds: string[]) => void
  maxVideos?: number
}

export function MultiVideoInput({
  value,
  onChange,
  maxVideos = 5,
}: MultiVideoInputProps) {
  const [uploadedVideos, setUploadedVideos] = useState<VideoItem[]>([])
  const [currentFileName, setCurrentFileName] = useState<string>()
  const [isUploadActive, setIsUploadActive] = useState(false)

  const { uploadVideo, isUploading, uploadProgress, isProcessing } =
    useVideoUpload({
      onSuccess: (data) => {
        const newVideo = { assetId: data.assetId, playbackId: data.playbackId }
        setUploadedVideos((prev) => [...prev, newVideo])
        onChange([...value, data.assetId])
        setCurrentFileName(undefined)
        setIsUploadActive(false)
      },
      onError: () => {
        setCurrentFileName(undefined)
        setIsUploadActive(false)
      },
    })

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const [file] = acceptedFiles

      if (file && value.length < maxVideos) {
        setCurrentFileName(file.name)
        setIsUploadActive(true)
        uploadVideo(file)
      }
    },
    [uploadVideo, value.length, maxVideos],
  )

  const { getInputProps, getRootProps } = useDropzone({
    accept: { "video/*": [] },
    multiple: false,
    onDrop,
    disabled: value.length >= maxVideos || isUploading || isProcessing,
  })

  const removeVideo = (index: number) => {
    const newAssetIds = value.filter((_, i) => i !== index)
    const newVideos = uploadedVideos.filter((_, i) => i !== index)
    setUploadedVideos(newVideos)
    onChange(newAssetIds)
  }

  const isUploadInProgress = isUploading || isProcessing
  const canAddMore = value.length < maxVideos && !isUploadInProgress

  return (
    <div className="space-y-3">
      {/* Uploaded videos preview */}
      {uploadedVideos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {uploadedVideos.map((video, index) => (
            <div
              key={video.assetId}
              className="relative overflow-clip rounded-md border"
            >
              <VideoPlayer className="w-full" playbackId={video.playbackId} />
              <Button
                className="absolute top-2 right-2"
                onClick={() => removeVideo(index)}
                type="button"
                size="icon-sm"
                variant="secondary"
              >
                <TrashIcon className="size-4" />
              </Button>
              <div className="bg-background/80 absolute bottom-2 left-2 rounded px-1.5 py-0.5 text-xs">
                Video {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {(canAddMore || isUploadInProgress) && (
        <UploadDropZone
          getRootProps={getRootProps}
          getInputProps={getInputProps}
          disabled={isUploadInProgress || !canAddMore}
        >
          <span className="text-muted-foreground block w-full truncate px-3 text-center text-sm">
            {currentFileName ?? `add video (${value.length}/${maxVideos})`}
          </span>

          {isUploadActive && isUploading && (
            <Progress
              value={uploadProgress}
              className="absolute inset-x-0 bottom-0 h-1 rounded-none"
            />
          )}

          {isUploadActive && isProcessing && (
            <div className="text-muted-foreground absolute bottom-0.5 flex w-full items-center justify-center gap-1 text-xs font-medium">
              <span>processing</span>
              <Loader2Icon className="size-3 animate-spin" />
            </div>
          )}
        </UploadDropZone>
      )}

      {/* Max reached indicator */}
      {!canAddMore && value.length >= maxVideos && (
        <p className="text-muted-foreground text-center text-sm">
          Maximum {maxVideos} {pluralize("video", maxVideos)} reached
        </p>
      )}
    </div>
  )
}
