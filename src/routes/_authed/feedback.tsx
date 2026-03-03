import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { Loader2Icon, TrashIcon } from "lucide-react"
import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone-esm"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { type z } from "zod"

import { ImageInput } from "~/components/input/image-input"
import { UploadDropZone } from "~/components/input/upload-drop-zone"
import { PageHeader } from "~/components/page-header"
import { Button } from "~/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSubmitButton,
} from "~/components/ui/form"
import { Label } from "~/components/ui/label"
import { Progress } from "~/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"
import { Textarea } from "~/components/ui/textarea"
import { VideoPlayer } from "~/components/video-player"
import { feedback } from "~/lib/feedback"
import { useVideoUpload } from "~/lib/media"

const MEDIA_OPTIONS = {
  none: "none",
  image: "image",
  video: "video",
} as const

type MediaOption = keyof typeof MEDIA_OPTIONS

export const Route = createFileRoute("/_authed/feedback")({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()

  const [mediaOption, setMediaOption] = useState<MediaOption>("none")

  const { mutateAsync } = useMutation({
    mutationFn: feedback.submit.fn,
    onSuccess: () => {
      toast.success("tysm for your feedback!")
      router.history.back()
    },
    onError: () => {
      toast.error("failed to submit feedback")
    },
  })

  const rhf = useForm<z.input<typeof feedback.submit.schema>>({
    resolver: zodResolver(feedback.submit.schema),
    shouldUnregister: false,
  })

  const {
    control,
    formState: { isSubmitting },
    handleSubmit,
  } = rhf

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>feedback</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <Form
        rhf={rhf}
        className="mx-auto flex min-h-0 w-full max-w-5xl grow flex-col gap-4 p-4"
        id="main-content"
        method="post"
        onSubmit={(event) => {
          handleSubmit(async (data) => {
            await mutateAsync({ data })
          })(event)
        }}
      >
        <FormField
          control={control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>message</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="share your thoughts, report bugs, or suggest improvements"
                  rows={6}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="media"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>attachment</FormLabel>
                <RadioGroup
                  className="flex gap-4 py-2"
                  onValueChange={(value) => {
                    field.onChange(undefined)
                    setMediaOption(value as MediaOption)
                  }}
                  value={mediaOption}
                >
                  {Object.entries(MEDIA_OPTIONS).map(([k, v]) => (
                    <Label
                      htmlFor={k}
                      className="flex items-center space-x-2"
                      key={k}
                    >
                      <RadioGroupItem id={k} value={k} />
                      {v}
                    </Label>
                  ))}
                </RadioGroup>
                {mediaOption !== "none" && (
                  <FormControl>
                    {mediaOption === "image" ? (
                      <ImageInput
                        previewClassNames="rounded-md size-86"
                        value={
                          field.value?.type === "image"
                            ? field.value.value
                            : undefined
                        }
                        onChange={(data) => {
                          field.onChange(
                            data ? { type: "image", value: data } : undefined,
                          )
                        }}
                      />
                    ) : (
                      <FeedbackVideoInput
                        value={
                          field.value?.type === "video"
                            ? field.value
                            : undefined
                        }
                        onChange={(data) => {
                          field.onChange(
                            data
                              ? {
                                  type: "video",
                                  assetId: data.assetId,
                                  playbackId: data.playbackId,
                                }
                              : undefined,
                          )
                        }}
                      />
                    )}
                  </FormControl>
                )}

                <FormMessage />
              </FormItem>
            )
          }}
        />
        <div className="flex justify-end">
          <FormSubmitButton busy={isSubmitting} />
        </div>
      </Form>
    </>
  )
}

function FeedbackVideoInput({
  value,
  onChange,
}: {
  value?: { assetId: string; playbackId: string }
  onChange: (data: { assetId: string; playbackId: string } | undefined) => void
}) {
  const [fileName, setFileName] = useState<string>()

  const { uploadVideo, isUploading, uploadProgress, isProcessing, reset } =
    useVideoUpload({
      onSuccess: (data) => {
        onChange(data)
      },
    })

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const [file] = acceptedFiles

      if (file) {
        setFileName(file.name)
        uploadVideo(file)
      }
    },
    [uploadVideo],
  )

  const { getInputProps, getRootProps } = useDropzone({
    accept: { "video/*": [] },
    multiple: false,
    onDrop,
  })

  const handleReset = () => {
    reset()
    setFileName(undefined)
    onChange(undefined)
  }

  if (value?.playbackId) {
    return (
      <div className="flex flex-col gap-2">
        <div className="relative flex overflow-clip rounded-md border">
          <VideoPlayer playbackId={value.playbackId} />

          <Button
            className="absolute top-2 right-2"
            onClick={handleReset}
            type="button"
            size="icon-sm"
            variant="secondary"
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
      disabled={isUploading || isProcessing}
    >
      <span className="text-muted-foreground text-sm">
        {fileName ?? "upload video"}
      </span>

      {isUploading && (
        <Progress
          value={uploadProgress}
          className="absolute inset-x-0 bottom-0 h-1 rounded-none"
        />
      )}

      {isProcessing && (
        <div className="text-muted-foreground absolute bottom-0.5 flex w-full items-center justify-center gap-1 text-xs font-medium">
          <span>processing</span>
          <Loader2Icon className="size-3 animate-spin" />
        </div>
      )}
    </UploadDropZone>
  )
}
