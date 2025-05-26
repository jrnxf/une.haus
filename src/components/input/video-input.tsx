import { useCallback } from "react";
import { useDropzone } from "react-dropzone-esm";

import * as Upchunk from "@mux/upchunk";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { useFormOps } from "~/components/ui/form-ops-provider";
import { Progress } from "~/components/ui/progress";
import { cn } from "~/lib/utils";

export const muxPresignedUrlSchema = z.object({
  id: z.string(),
  url: z.string(),
});

export const VideoInput = ({
  id,
  onChange,
}: {
  id: string;
  onChange: (uploadId: null | string) => void;
}) => {
  const { setVideoUploadPercentage, videoUploadPercentage } = useFormOps();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const [file] = acceptedFiles;
      if (file) {
        setVideoUploadPercentage(0);

        try {
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

            onChange(muxUploadId);
          });
        } catch {
          setVideoUploadPercentage(-1);
        }
      }
    },
    [onChange, setVideoUploadPercentage],
  );

  const { acceptedFiles, getInputProps, getRootProps } = useDropzone({
    accept: { "video/*": [] },
    multiple: false,
    onDrop,
  });

  return (
    <div className="flex h-28 items-center gap-2">
      <Button
        aria-label="file upload"
        className={cn(
          "border-border h-full w-full rounded-md border-2 border-dashed",
          videoUploadPercentage !== -1 && "hidden",
        )}
        type="button"
        variant="unstyled"
        {...getRootProps()}
      >
        <input {...getInputProps()} id={id} />
        <span className="w-64 leading-relaxed text-wrap sm:w-auto">
          {acceptedFiles[0]
            ? acceptedFiles[0].name
            : "Click to select a video or drag and drop one here"}
        </span>
      </Button>
      {videoUploadPercentage !== -1 && (
        <Progress className="h-3" value={videoUploadPercentage} />
      )}
    </div>
  );
};
