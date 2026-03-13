import * as Upchunk from "@mux/upchunk"
import { useMutation } from "@tanstack/react-query"
import { useCallback, useState } from "react"
import { toast } from "sonner"

import { media } from "~/lib/media"

type VideoUploadOptions = {
  onSuccess?: (data: { assetId: string; playbackId: string }) => void
  onError?: (error: unknown) => void
  onProgress?: (progress: number) => void
}

const CHUNK_SIZE = 5120
const MAX_VIDEO_FILE_SIZE_MB = 50
export const MAX_VIDEO_FILE_SIZE_BYTES = MAX_VIDEO_FILE_SIZE_MB * 1024 * 1024
const VIDEO_INVALID_TYPE_MESSAGE =
  "invalid file type. please upload a video file."
const VIDEO_TOO_LARGE_MESSAGE = `file too large. maximum size is ${MAX_VIDEO_FILE_SIZE_MB}MB.`
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  "video/x-matroska",
])

type FileRejectionLike = {
  errors: ReadonlyArray<{ code: string }>
}

export function getVideoFileRejectionMessage(
  fileRejections: ReadonlyArray<FileRejectionLike>,
) {
  const hasTooLarge = fileRejections.some((rejection) =>
    rejection.errors.some((error) => error.code === "file-too-large"),
  )

  if (hasTooLarge) {
    return VIDEO_TOO_LARGE_MESSAGE
  }

  const hasInvalidType = fileRejections.some((rejection) =>
    rejection.errors.some((error) => error.code === "file-invalid-type"),
  )

  if (hasInvalidType) {
    return VIDEO_INVALID_TYPE_MESSAGE
  }

  return "upload failed. please try another file."
}

export function useVideoUpload(options: VideoUploadOptions = {}) {
  const { onSuccess, onError, onProgress } = options

  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  const { mutateAsync: pollMuxVideoUploadStatus } = useMutation({
    mutationFn: media.pollMuxVideoUploadStatus.fn,
  })

  const createPresignedMuxUrl = useMutation({
    mutationFn: media.createPresignedMuxUrl.fn,
  })

  const uploadVideo = useCallback(
    async (file: File) => {
      if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
        toast.error(VIDEO_INVALID_TYPE_MESSAGE)
        onError?.(new Error("Invalid file type"))
        return
      }

      if (file.size > MAX_VIDEO_FILE_SIZE_BYTES) {
        toast.error(VIDEO_TOO_LARGE_MESSAGE)
        onError?.(new Error("File too large"))
        return
      }

      setIsUploading(true)
      setUploadProgress(0)
      setIsProcessing(false)

      try {
        const presignedMuxUrl = await createPresignedMuxUrl.mutateAsync({})
        const { id: uploadId, url: presignedUrl } = presignedMuxUrl

        const upload = Upchunk.createUpload({
          chunkSize: CHUNK_SIZE,
          endpoint: presignedUrl,
          file,
        })

        upload.on("error", (error) => {
          console.error("mux upload error", error.detail)
          const errorMessage =
            "upload failed. please try again and contact colby@jrnxf.co if the problem persists."
          toast.error(errorMessage)
          onError?.(error)
          setIsUploading(false)
          setUploadProgress(0)
          setIsProcessing(false)
        })

        upload.on("progress", (progress) => {
          const progressValue = Math.trunc(progress.detail)
          setUploadProgress(progressValue)
          onProgress?.(progressValue)
        })

        upload.on("success", async () => {
          setIsProcessing(true)

          try {
            const data = await pollMuxVideoUploadStatus({
              data: { uploadId },
            })
            onSuccess?.(data)
          } catch (error) {
            console.error("Processing error:", error)
            toast.error("video processing failed")
            onError?.(error)
          } finally {
            setIsUploading(false)
            setUploadProgress(0)
            setIsProcessing(false)
          }
        })
      } catch (error) {
        console.error("Upload setup error:", error)
        toast.error("upload setup failed")
        onError?.(error)
        setIsUploading(false)
        setUploadProgress(0)
        setIsProcessing(false)
      }
    },
    [
      createPresignedMuxUrl,
      pollMuxVideoUploadStatus,
      onSuccess,
      onError,
      onProgress,
    ],
  )

  const reset = useCallback(() => {
    setIsUploading(false)
    setUploadProgress(0)
    setIsProcessing(false)
  }, [])

  return {
    uploadVideo,
    isUploading,
    uploadProgress,
    isProcessing,
    reset,
  }
}
