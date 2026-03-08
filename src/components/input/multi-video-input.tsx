import { TrashIcon } from "lucide-react"
import pluralize from "pluralize"
import { useCallback, useEffect, useState } from "react"
import { useDropzone } from "react-dropzone-esm"
import { toast } from "sonner"

import { UploadDropZone } from "~/components/input/upload-drop-zone"
import { Button } from "~/components/ui/button"
import { useFormMedia } from "~/components/ui/form"
import { VideoPlayer } from "~/components/video-player"
import {
  getVideoFileRejectionMessage,
  MAX_VIDEO_FILE_SIZE_BYTES,
  useVideoUpload,
} from "~/lib/media"

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
  const {
    setMediaUploadFileName,
    setMediaUploadFileSizeBytes,
    setVideoUploadStatus,
  } = useFormMedia()
  const [uploadedVideos, setUploadedVideos] = useState<VideoItem[]>([])
  const [currentFileName, setCurrentFileName] = useState<string>()

  const { uploadVideo, isUploading, isProcessing } = useVideoUpload({
    onSuccess: (data) => {
      const newVideo = { assetId: data.assetId, playbackId: data.playbackId }
      setUploadedVideos((prev) => [...prev, newVideo])
      onChange([...value, data.assetId])
      setCurrentFileName(undefined)
      setMediaUploadFileName(undefined)
      setMediaUploadFileSizeBytes(undefined)
      setVideoUploadStatus("idle")
    },
    onError: () => {
      setCurrentFileName(undefined)
      setMediaUploadFileName(undefined)
      setMediaUploadFileSizeBytes(undefined)
      setVideoUploadStatus("idle")
    },
  })

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const [file] = acceptedFiles

      if (file && value.length < maxVideos) {
        setCurrentFileName(file.name)
        setMediaUploadFileName(file.name)
        setMediaUploadFileSizeBytes(file.size)
        setVideoUploadStatus(0)
        uploadVideo(file)
      }
    },
    [
      uploadVideo,
      maxVideos,
      setMediaUploadFileName,
      setMediaUploadFileSizeBytes,
      setVideoUploadStatus,
      value.length,
    ],
  )

  const { getInputProps, getRootProps } = useDropzone({
    accept: { "video/*": [] },
    multiple: false,
    maxSize: MAX_VIDEO_FILE_SIZE_BYTES,
    onDrop,
    onDropRejected: (fileRejections) => {
      setCurrentFileName(undefined)
      setMediaUploadFileName(undefined)
      setMediaUploadFileSizeBytes(undefined)
      setVideoUploadStatus("idle")
      toast.error(getVideoFileRejectionMessage(fileRejections))
    },
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

  useEffect(() => {
    if (isProcessing) {
      setVideoUploadStatus("processing")
    }
  }, [isProcessing, setVideoUploadStatus])

  return (
    <div className="space-y-3">
      {/* Uploaded videos preview */}
      {uploadedVideos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {uploadedVideos.map((video, index) => (
            <div
              key={video.assetId}
              className="border-input relative overflow-clip rounded-md border"
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
          <span className="text-muted-foreground block w-full truncate text-left text-sm">
            {currentFileName ?? "Choose File"}
          </span>
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
