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
  imageName,
  videoName,
}: {
  imageName: string;
  videoName: string;
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

            setValue(imageName, imageUrl);
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

            setValue(videoName, muxUploadId);
          });
        }
      }
    },
    [
      imageName,
      setPendingImageUpload,
      setValue,
      setVideoUploadPercentage,
      videoName,
    ],
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
    <div className="flex h-28 items-center gap-2">
      <Button
        aria-label="file upload"
        className="border-border h-full w-full rounded-md border-2 border-dashed"
        type="button"
        variant="unstyled"
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        <span className="w-64 leading-relaxed text-wrap sm:w-auto">
          {acceptedFiles[0]
            ? acceptedFiles[0].name
            : "Click to select a file or drag and drop one here"}
        </span>
      </Button>
      {videoUploadPercentage !== -1 && (
        <Progress className="h-3" value={videoUploadPercentage} />
      )}
    </div>
  );
}
