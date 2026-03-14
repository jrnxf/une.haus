import { TrashIcon, UploadIcon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useDropzone } from "react-dropzone-esm"
import { toast } from "sonner"

import { UploadDropZone } from "~/components/input/upload-drop-zone"
import { Button } from "~/components/ui/button"
import { useFormField, useFormMedia } from "~/components/ui/form"
import { VideoPlayer } from "~/components/video-player"
import {
  getVideoFileRejectionMessage,
  MAX_VIDEO_FILE_SIZE_BYTES,
  useVideoUpload,
} from "~/lib/media"

export const VideoInput = ({
  onChange,
  showPreview = true,
}: {
  onChange: (assetId: string | undefined) => void
  showPreview?: boolean
}) => {
  const { formItemId } = useFormField()

  const [fileName, setFileName] = useState<string>()
  const [playbackId, setPlaybackId] = useState<string>()

  const {
    setMediaUploadFileName,
    setMediaUploadFileSizeBytes,
    setVideoUploadStatus,
  } = useFormMedia()

  const { uploadVideo, isUploading, isProcessing } = useVideoUpload({
    onSuccess: (data) => {
      onChange(data.assetId)
      setPlaybackId(data.playbackId)
      setMediaUploadFileName(undefined)
      setMediaUploadFileSizeBytes(undefined)
      setVideoUploadStatus("idle")
    },
    onProgress: (progress) => {
      setVideoUploadStatus(progress)
    },
    onError: () => {
      setFileName(undefined)
      setMediaUploadFileName(undefined)
      setMediaUploadFileSizeBytes(undefined)
      setVideoUploadStatus("idle")
    },
  })

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const [file] = acceptedFiles

      if (file) {
        setFileName(file.name)
        setMediaUploadFileName(file.name)
        setMediaUploadFileSizeBytes(file.size)
        setVideoUploadStatus(0)
        uploadVideo(file)
      }
    },
    [
      uploadVideo,
      setMediaUploadFileName,
      setMediaUploadFileSizeBytes,
      setVideoUploadStatus,
    ],
  )

  const onDropRejected = useCallback(
    (
      fileRejections: ReadonlyArray<{
        errors: ReadonlyArray<{ code: string }>
      }>,
    ) => {
      setFileName(undefined)
      setMediaUploadFileName(undefined)
      setMediaUploadFileSizeBytes(undefined)
      setVideoUploadStatus("idle")
      toast.error(getVideoFileRejectionMessage(fileRejections))
    },
    [setMediaUploadFileName, setMediaUploadFileSizeBytes, setVideoUploadStatus],
  )

  const { getInputProps, getRootProps } = useDropzone({
    accept: { "video/*": [] },
    multiple: false,
    maxSize: MAX_VIDEO_FILE_SIZE_BYTES,
    onDrop,
    onDropRejected,
  })

  const reset = () => {
    setVideoUploadStatus("idle")
    setMediaUploadFileName(undefined)
    setMediaUploadFileSizeBytes(undefined)
    setPlaybackId(undefined)
    setFileName(undefined)
    onChange(undefined)
  }

  useEffect(() => {
    if (isProcessing) {
      setVideoUploadStatus("processing")
    }
  }, [isProcessing, setVideoUploadStatus])

  if (playbackId) {
    if (!showPreview) {
      return null
    }
    return (
      <div className="flex flex-col gap-2">
        <div className="border-input relative overflow-clip rounded-md border">
          <VideoPlayer className="w-full" playbackId={playbackId} />

          <Button
            className="absolute top-2 right-2"
            onClick={reset}
            type="button"
            size="icon-sm"
            variant="secondary"
            aria-label="remove video"
          >
            <TrashIcon className="size-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <UploadDropZone
      getRootProps={getRootProps}
      getInputProps={getInputProps}
      inputId={formItemId}
      disabled={isUploading || isProcessing}
      hasFile={Boolean(fileName)}
    >
      <UploadIcon className="size-3.5" />
      <span className="truncate text-left">{fileName ?? "select file"}</span>
    </UploadDropZone>
  )
}
