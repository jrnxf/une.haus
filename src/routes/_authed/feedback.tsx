import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Loader2Icon, TrashIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone-esm";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { type z } from "zod";

import { ImageInput } from "~/components/input/image-input";
import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSubmitButton,
} from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { Progress } from "~/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Textarea } from "~/components/ui/textarea";
import { VideoPlayer } from "~/components/video-player";
import { feedback } from "~/lib/feedback";
import { useVideoUpload } from "~/lib/media";

const MEDIA_OPTIONS = {
  none: "None",
  image: "Image",
  video: "Video",
} as const;

type MediaOption = keyof typeof MEDIA_OPTIONS;

export const Route = createFileRoute("/_authed/feedback")({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();

  const [mediaOption, setMediaOption] = useState<MediaOption>("none");

  const { mutateAsync } = useMutation({
    mutationFn: feedback.submit.fn,
    onSuccess: () => {
      toast.success("Thank you so much for your feedback!");
      router.history.back();
    },
    onError: () => {
      toast.error("Failed to submit feedback");
    },
  });

  const rhf = useForm<z.input<typeof feedback.submit.schema>>({
    resolver: zodResolver(feedback.submit.schema),
    shouldUnregister: false,
  });

  const {
    control,
    formState: { isSubmitting },
    handleSubmit,
  } = rhf;

  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>feedback</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <Form
        rhf={rhf}
        className="mx-auto flex min-h-0 w-full max-w-4xl grow flex-col gap-4 p-4 md:p-6"
        id="main-content"
        method="post"
        onSubmit={(event) => {
          handleSubmit(async (data) => {
            await mutateAsync({ data });
          })(event);
        }}
      >
        <p className="text-muted-foreground">
          Share your thoughts, report bugs, or suggest improvements.
        </p>

      <FormField
        control={control}
        name="content"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Your feedback</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder="What's on your mind?"
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
              <FormLabel>Attachment</FormLabel>
              <RadioGroup
                className="flex gap-6 py-2"
                onValueChange={(value) => {
                  field.onChange(undefined);
                  setMediaOption(value as MediaOption);
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
              <FormControl>
                <>
                  {mediaOption === "image" && (
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
                        );
                      }}
                    />
                  )}

                  {mediaOption === "video" && (
                    <FeedbackVideoInput
                      value={
                        field.value?.type === "video" ? field.value : undefined
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
                        );
                      }}
                    />
                  )}
                </>
              </FormControl>

              <FormMessage />
            </FormItem>
          );
        }}
      />
      <div className="flex justify-end">
        <FormSubmitButton busy={isSubmitting} />
      </div>
      </Form>
    </>
  );
}

function FeedbackVideoInput({
  value,
  onChange,
}: {
  value?: { assetId: string; playbackId: string };
  onChange: (data: { assetId: string; playbackId: string } | undefined) => void;
}) {
  const [fileName, setFileName] = useState<string>();

  const { uploadVideo, isUploading, uploadProgress, isProcessing, reset } =
    useVideoUpload({
      onSuccess: (data) => {
        onChange(data);
      },
    });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const [file] = acceptedFiles;

      if (file) {
        setFileName(file.name);
        uploadVideo(file);
      }
    },
    [uploadVideo],
  );

  const { getInputProps, getRootProps } = useDropzone({
    accept: { "video/*": [] },
    multiple: false,
    onDrop,
  });

  const handleReset = () => {
    reset();
    setFileName(undefined);
    onChange(undefined);
  };

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
    );
  }

  return (
    <div className="flex h-16 items-center gap-2">
      <Button
        aria-label="file upload"
        className="border-border relative h-full w-full overflow-hidden rounded-md border-2 border-dashed"
        type="button"
        variant="unstyled"
        {...getRootProps()}
      >
        <input {...getInputProps()} disabled={isUploading || isProcessing} />
        <span className="text-muted-foreground text-sm">
          {fileName ?? "Select a video to upload"}
        </span>

        {isUploading && (
          <Progress
            value={uploadProgress}
            className="absolute bottom-0 h-1 rounded-none"
          />
        )}

        {isProcessing && (
          <div className="text-muted-foreground absolute bottom-0.5 flex w-full items-center justify-center gap-1 text-xs font-medium">
            <span>processing</span>
            <Loader2Icon className="size-3 animate-spin" />
          </div>
        )}
      </Button>
    </div>
  );
}
