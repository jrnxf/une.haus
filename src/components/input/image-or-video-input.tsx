import MuxPlayer from "@mux/mux-player-react";
import { TrashIcon } from "lucide-react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone-esm";
import { useFormContext } from "react-hook-form";

import * as Upchunk from "@mux/upchunk";

import { muxPresignedUrlSchema } from "~/components/input/video-input";
import { Button } from "~/components/ui/button";
import { useFormOps } from "~/components/ui/form-ops-provider";
import { Progress } from "~/components/ui/progress";
import { media } from "~/lib/media";

export function ImageOrVideoInput({
  value,
  onChange,
}: {
  value: { type: "image" | "video"; value: string } | undefined;
  onChange: (
    data: { type: "image" | "video"; value: string } | undefined,
  ) => void;
}) {
  const form = useFormContext();

  const { setValue } = form;
  const {
    setPendingImageUpload,
    setVideoUploadPercentage,
    videoUploadPercentage,
  } = useFormOps();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const [file] = acceptedFiles;
      if (file) {
        const isImage = file.type.startsWith("image");
        const isVideo = file.type.startsWith("video");

        if (isImage) {
          try {
            setPendingImageUpload(true);
            const presignedS3Url = await media.createPresignedS3Url.fn({
              data: {
                fileName: file.name,
              },
            });
            const { href, origin, pathname } = new URL(presignedS3Url);

            await fetch(href, { body: file, method: "PUT" });

            const imageUrl = origin + pathname;

            onChange({ type: "image", value: imageUrl });
          } finally {
            setPendingImageUpload(false);
          }
        }

        if (isVideo) {
          const res = await fetch("/api/mux/url");
          const uploadSpec = await res.json();

          const { id: muxUploadId, url: presignedUrl } =
            muxPresignedUrlSchema.parse(uploadSpec);

          const upload = Upchunk.createUpload({
            chunkSize: 5120, // upload the video in ~5mb chunks
            endpoint: presignedUrl,
            file,
          });

          // subscribe to events
          upload.on("error", (error) => {
            console.error("💥 🙀", error.detail);
          });

          upload.on("progress", (progress) => {
            setVideoUploadPercentage(Math.trunc(progress.detail));
          });

          upload.on("success", () => {
            setTimeout(() => {
              // nice for users to see 100 for a sec
              setVideoUploadPercentage(-1);
            }, 1000);

            onChange({ type: "video", value: muxUploadId });
          });
        }
      }
    },
    [setPendingImageUpload, setValue, setVideoUploadPercentage],
  );

  const { acceptedFiles, getInputProps, getRootProps } = useDropzone({
    accept: {
      "image/*": [],
      "video/*": [],
    },
    multiple: false,
    onDrop,
  });

  return (
    <div>
      {!value && (
        <div className="relative flex h-32 items-center gap-2">
          <Button
            aria-label="file upload"
            className="border-border h-full w-full rounded-md border-2 border-dashed"
            type="button"
            variant="unstyled"
            {...getRootProps()}
          >
            <input {...getInputProps()} />
            {videoUploadPercentage === -1 && (
              <span className="w-64 leading-relaxed text-wrap sm:w-auto">
                {acceptedFiles[0]
                  ? acceptedFiles[0].name
                  : "Click to select a file or drag and drop one here"}
              </span>
            )}
          </Button>
          {videoUploadPercentage !== -1 && (
            <div className="absolute inset-0 z-10 flex h-full flex-col justify-center p-4">
              <Progress className="h-3" value={videoUploadPercentage} />
            </div>
          )}
        </div>
      )}

      {value && (
        <div className="flex flex-col gap-2">
          <Button
            iconRight={<TrashIcon className="size-4" />}
            onClick={() => {
              onChange(undefined);
            }}
            type="button"
            variant="destructive"
            className="self-start"
          >
            Delete
          </Button>

          <div className="h-80">
            {value.type === "image" ? (
              <img
                alt=""
                className="h-full rounded-lg object-cover"
                src={value.value}
              />
            ) : value.type === "video" ? (
              <MuxPlayer
                accentColor="#000000"
                className="aspect-video"
                // playbackId={defaultValues.videoPlaybackId}
                playbackRates={[0.1, 0.25, 0.5, 0.75, 1]}
                // poster={getMuxPoster(defaultValues.videoPlaybackId)}
                preload="none" // save on bandwidth
                streamType="on-demand"
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
