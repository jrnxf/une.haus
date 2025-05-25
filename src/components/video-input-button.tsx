import * as Upchunk from "@mux/upchunk";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone-esm";
import { z } from "zod";

import { Button } from "~/components/ui/button";

export const muxPresignedUrlSchema = z.object({
  id: z.string(),
  url: z.string(),
});

export const VideoInputButton = ({
  onUploadSuccess,
}: {
  onUploadSuccess: (uploadId: string) => void;
}) => {
  const [videoUploadPercentage, setVideoUploadPercentage] = useState(-1);

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

            onUploadSuccess(muxUploadId);
          });
        } catch {
          setVideoUploadPercentage(-1);
        }
      }
    },
    [onUploadSuccess, setVideoUploadPercentage],
  );

  const { getInputProps, getRootProps } = useDropzone({
    accept: { "video/*": [] },
    multiple: false,
    onDrop,
  });

  return (
    <Button
      aria-label="file upload"
      type="button"
      variant="outline"
      {...getRootProps()}
    >
      <input {...getInputProps()} />
      {videoUploadPercentage === -1 ? (
        "Upload Submission"
      ) : (
        <span className="text-xs">{videoUploadPercentage}%</span>
      )}
    </Button>
  );
};
