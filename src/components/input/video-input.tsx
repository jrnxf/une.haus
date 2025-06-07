import MuxPlayer from "@mux/mux-player-react";
import { useQuery } from "@tanstack/react-query";
import { Loader2Icon, TrashIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone-esm";

import * as Upchunk from "@mux/upchunk";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { useFormField, useFormMedia } from "~/components/ui/form";
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

  const { setVideoUploadStatus, videoUploadStatus } = useFormMedia();
  const [muxUploadId, setMuxUploadId] = useState("");

  const { data: video } = useQuery({
    ...media.pollVideoUploadStatus.queryOptions({
      uploadId: muxUploadId,
    }),
    refetchInterval: (data) => {
      if (data.state.data?.playbackId) {
        return false;
      }
      return 1000;
    },
    enabled: Boolean(muxUploadId),
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const [file] = acceptedFiles;
      if (file) {
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
            console.error("💥 🙀", error.detail);
          });

          upload.on("progress", (progress) => {
            setVideoUploadStatus(Math.trunc(progress.detail));
          });

          upload.on("success", () => {
            setTimeout(() => {
              // nice for users to see 100 for a sec
              setVideoUploadStatus("idle");
            }, 1000);

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

  const { acceptedFiles, getInputProps, getRootProps } = useDropzone({
    accept: { "video/*": [] },
    multiple: false,
    onDrop,
  });

  if (video?.playbackId) {
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
          onClick={() => {
            setMuxUploadId("");
            onChange(null);
          }}
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
        className="border-border h-full w-full rounded-md border-2 border-dashed"
        type="button"
        variant="unstyled"
        {...getRootProps()}
      >
        <input {...getInputProps()} id={formItemId} />
        <span className="w-64 leading-relaxed text-wrap sm:w-auto">
          {acceptedFiles[0]
            ? acceptedFiles[0].name
            : "Click to select a video or drag and drop one here"}
        </span>
        {(videoUploadStatus !== "idle" || muxUploadId) && (
          <Loader2Icon className="size-4 animate-spin" />
        )}
      </Button>
    </div>
  );
};
