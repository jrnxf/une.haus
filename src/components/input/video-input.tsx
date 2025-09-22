import MuxPlayer from "@mux/mux-player-react";
import { skipToken, useMutation, useQuery } from "@tanstack/react-query";
import { Loader2Icon, TrashIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone-esm";

import * as Upchunk from "@mux/upchunk";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { useFormField, useFormMedia } from "~/components/ui/form";
import { Progress } from "~/components/ui/progress";
import { getMuxPoster } from "~/components/video-player";
import { Json } from "~/lib/dx/json";
import { media } from "~/lib/media";

export const muxPresignedUrlSchema = z.object({
  id: z.string(),
  url: z.string(),
});

export const VideoInput = ({
  onChange,
}: {
  onChange: (assetId: undefined | string) => void;
}) => {
  const { formItemId } = useFormField();

  const [fileName, setFileName] = useState<string>();

  const [uploadId, setUploadId] = useState<string>();

  const { setVideoUploadStatus, videoUploadStatus } = useFormMedia();

  const { data: videoData } = useQuery({
    ...media.getMuxVideoUploadStatus.queryOptions(
      uploadId ? { uploadId } : skipToken,
    ),
    refetchInterval: (data) => {
      const response = data.state.data;
      if (response) {
        if (response.assetId) {
          onChange(response.assetId);
        }
        if (response.playbackId) {
          setVideoUploadStatus("idle");
          return false;
        }
      }
      return 1000; // poll every second
    },
  });

  const createPresignedMuxUrl = useMutation({
    mutationFn: media.createPresignedMuxUrl.fn,
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const [file] = acceptedFiles;

      if (file) {
        setFileName(file.name);
        setVideoUploadStatus(0);

        try {
          const presignedMuxUrl = await createPresignedMuxUrl.mutateAsync({});

          console.log("presignedMuxUrl", presignedMuxUrl);

          const { id: uploadId, url: presignedUrl } = presignedMuxUrl;

          const upload = Upchunk.createUpload({
            chunkSize: 5120, // upload the video in ~5mb chunks
            endpoint: presignedUrl,
            file,
          });

          // subscribe to events
          upload.on("error", (error) => {
            toast.error(
              <span>
                Upload failed. Please try again and contact{" "}
                <span className="font-bold">colby@jrnxf.co</span> if the problem
                persists.
              </span>,
            );
            // sentry
            console.error("mux upload error", error.detail);
          });

          upload.on("progress", (progress) => {
            setVideoUploadStatus(Math.trunc(progress.detail));
          });

          upload.on("success", () => {
            setVideoUploadStatus("processing");
            setUploadId(uploadId);
          });
        } catch {
          setVideoUploadStatus("idle");
        }
      }
    },
    [onChange, setVideoUploadStatus],
  );

  const { getInputProps, getRootProps } = useDropzone({
    accept: { "video/*": [] },
    multiple: false,
    onDrop,
  });

  const reset = () => {
    setVideoUploadStatus("idle");
    setUploadId(undefined);
    setFileName(undefined);
    onChange(undefined);
  };

  if (videoData && videoData.playbackId) {
    return (
      <div className="flex flex-col gap-2">
        <div className="overflow-clip rounded-md border-2 border-dashed">
          <MuxPlayer
            accentColor="#000000"
            className="aspect-video"
            playbackId={videoData.playbackId}
            playbackRates={[0.1, 0.25, 0.5, 0.75, 1]}
            poster={getMuxPoster(videoData.playbackId)}
            preload="none" // save on bandwidth
            streamType="on-demand"
          />
        </div>

        <Button
          className="self-start"
          onClick={reset}
          iconRight={<TrashIcon className="size-4" />}
          type="button"
          variant="destructive"
        >
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-32 items-center gap-2">
      <Button
        aria-label="file upload"
        className="border-border relative h-full w-full overflow-hidden rounded-md border-2 border-dashed"
        type="button"
        variant="unstyled"
        {...getRootProps()}
      >
        <input
          {...getInputProps()}
          disabled={videoUploadStatus !== "idle"}
          id={formItemId}
        />
        <span className="w-64 leading-relaxed text-wrap sm:w-auto">
          {fileName ?? "Click to select a video or drag and drop one here"}
        </span>

        {typeof videoUploadStatus === "number" && (
          <Progress
            value={videoUploadStatus}
            className="absolute bottom-0 h-1 rounded-none"
          />
        )}

        {videoUploadStatus === "processing" && (
          <div className="text-muted-foreground absolute bottom-0.5 flex w-full items-center justify-center gap-1 text-xs font-medium">
            <span>Processing</span>
            <Loader2Icon className="size-3 animate-spin" />
          </div>
        )}
      </Button>
    </div>
  );
};
