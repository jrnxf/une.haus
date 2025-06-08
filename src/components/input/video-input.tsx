import MuxPlayer from "@mux/mux-player-react";
import { skipToken, useQuery } from "@tanstack/react-query";
import { Loader2Icon, TrashIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone-esm";

import * as Upchunk from "@mux/upchunk";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { useFormField, useFormMedia } from "~/components/ui/form";
import { Progress } from "~/components/ui/progress";
import { getMuxPoster } from "~/components/video-player";
import { media } from "~/lib/media";

export const muxPresignedUrlSchema = z.object({
  id: z.string(),
  url: z.string(),
});

export const VideoInput = ({
  onChange,
}: {
  onChange: (uploadId: null | string) => void;
}) => {
  const { formItemId } = useFormField();

  const [fileName, setFileName] = useState<string>();
  const [muxUploadId, setMuxUploadId] = useState<string>();

  const { setVideoUploadStatus, videoUploadStatus } = useFormMedia();

  const { data: video } = useQuery({
    ...media.pollVideoUploadStatus.queryOptions(
      muxUploadId
        ? {
            uploadId: muxUploadId,
          }
        : skipToken,
    ),
    refetchInterval: (data) => {
      if (data.state.data && data.state.data.playbackId) {
        // the video is now ready!
        setVideoUploadStatus("idle");
        return false;
      }
      return 1000;
    },
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const [file] = acceptedFiles;

      if (file) {
        setFileName(file.name);
        setVideoUploadStatus(0);

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
            console.error("mux upload error", error.detail);
          });

          upload.on("progress", (progress) => {
            console.log(progress.detail);
            setVideoUploadStatus(Math.trunc(progress.detail));
          });

          upload.on("success", () => {
            setTimeout(() => {
              // let users see 100 for a blip
              setVideoUploadStatus("processing");
            }, 300);

            onChange(muxUploadId);
            setMuxUploadId(muxUploadId);
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
    setMuxUploadId(undefined);
    setFileName(undefined);
    onChange(null);
  };

  if (video && video.playbackId) {
    return (
      <div className="flex flex-col gap-2">
        <MuxPlayer
          accentColor="#000000"
          className="aspect-video"
          playbackId={video.playbackId}
          playbackRates={[0.1, 0.25, 0.5, 0.75, 1]}
          poster={getMuxPoster(video.playbackId)}
          preload="none" // save on bandwidth
          streamType="on-demand"
        />
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
        <input {...getInputProps()} id={formItemId} />
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
