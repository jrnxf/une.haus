import { useMutation } from "@tanstack/react-query"
import { Loader2Icon, UploadIcon } from "lucide-react"
import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone-esm"
import z from "zod"

import { UploadDropZone } from "~/components/input/upload-drop-zone"
import { Button } from "~/components/ui/button"
import { useFormField, useFormMedia } from "~/components/ui/form"
import { invariant } from "~/lib/invariant"
import { media } from "~/lib/media"
import { nano } from "~/lib/nanoid"
import { cn, getCloudflareImageUrl } from "~/lib/utils"

const cloudflareDirectUploadResponseSchema = z.object({
  result: z.object({
    id: z.string(),
  }),
})

export const ImageInput = ({
  value,
  onChange,
  previewClassNames,
}: {
  value: string | null | undefined
  onChange: (url: null | string) => void
  previewClassNames?: string
}) => {
  const { formItemId } = useFormField()

  const [file, setFile] = useState<File>()

  const createCloudflareImagesDirectUpload = useMutation({
    mutationFn: media.createCloudflareImagesDirectUpload.fn,
  })

  const {
    imageUploadStatus,
    setImageUploadStatus,
    setMediaUploadFileName,
    setMediaUploadFileSizeBytes,
  } = useFormMedia()

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const [file] = acceptedFiles
      if (file) {
        setFile(file)
        setMediaUploadFileName(file.name)
        setMediaUploadFileSizeBytes(file.size)
        try {
          setImageUploadStatus("pending")
          const directUpload =
            await createCloudflareImagesDirectUpload.mutateAsync({})

          invariant(directUpload.uploadURL, "Failed to create direct upload")

          const ext = file.name.split(".").pop()
          const newFileName = `${nano()}.${ext}`

          const formData = new FormData()
          formData.append("file", file, newFileName)

          const response = await fetch(directUpload.uploadURL, {
            body: formData,
            method: "POST",
          })

          const data = await response.json()
          const parsedData = cloudflareDirectUploadResponseSchema.parse(data)

          onChange(parsedData.result.id)
        } catch {
          setFile(undefined)
          setMediaUploadFileName(undefined)
          setMediaUploadFileSizeBytes(undefined)
        } finally {
          setImageUploadStatus("idle")
          setMediaUploadFileName(undefined)
          setMediaUploadFileSizeBytes(undefined)
        }
      }
    },
    [
      createCloudflareImagesDirectUpload,
      onChange,
      setImageUploadStatus,
      setMediaUploadFileName,
      setMediaUploadFileSizeBytes,
    ],
  )

  const { getInputProps, getRootProps } = useDropzone({
    accept: { "image/jpeg": [], "image/png": [], "image/gif": [] },
    multiple: false,
    onDrop,
  })

  const previewSource = file
    ? URL.createObjectURL(file)
    : value
      ? getCloudflareImageUrl(value, { width: 400, quality: 80 })
      : null

  if (previewSource) {
    return (
      <div className="flex flex-col gap-2">
        <div
          className={cn(
            "group relative flex size-48 shrink-0 items-center justify-center overflow-hidden rounded-full",
            previewClassNames,
          )}
        >
          <img
            alt=""
            className={cn(
              "size-full object-cover",
              imageUploadStatus === "pending" && "opacity-30",
            )}
            src={previewSource}
          />
          {imageUploadStatus === "pending" && (
            <div className="absolute inset-0 flex h-full items-center justify-center bg-zinc-900/50 text-white">
              <Loader2Icon className="size-6 animate-spin duration-700" />
            </div>
          )}
        </div>
        <Button
          className="self-start"
          onClick={() => {
            setFile(undefined)
            onChange(null)
          }}
          type="button"
          variant="destructive"
        >
          remove
        </Button>
      </div>
    )
  }

  return (
    <UploadDropZone
      getRootProps={getRootProps}
      getInputProps={getInputProps}
      inputId={formItemId}
      hasFile={Boolean(file)}
    >
      <UploadIcon className="size-3.5" />
      <span className="truncate text-left">select file</span>
    </UploadDropZone>
  )
}
