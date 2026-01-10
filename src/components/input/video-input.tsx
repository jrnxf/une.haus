import { Loader2Icon, TrashIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone-esm";

import { Button } from "~/components/ui/button";
import { useFormField, useFormMedia } from "~/components/ui/form";
import { Progress } from "~/components/ui/progress";
import { VideoPlayer } from "~/components/video-player";
import { useVideoUpload } from "~/lib/media";

export const VideoInput = ({
  onChange,
  showPreview = true,
}: {
  onChange: (assetId: string | undefined) => void;
  showPreview?: boolean;
}) => {
  const { formItemId } = useFormField();

  const [fileName, setFileName] = useState<string>();
  const [playbackId, setPlaybackId] = useState<string>();

  const { setVideoUploadStatus } = useFormMedia();

  const { uploadVideo, isUploading, uploadProgress, isProcessing } =
    useVideoUpload({
      onSuccess: (data) => {
        onChange(data.assetId);
        setPlaybackId(data.playbackId);
        setVideoUploadStatus("idle");
      },
      onProgress: (progress) => {
        setVideoUploadStatus(progress);
      },
      onError: () => {
        setVideoUploadStatus("idle");
      },
    });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const [file] = acceptedFiles;

      if (file) {
        setFileName(file.name);
        setVideoUploadStatus(0);
        uploadVideo(file);
      }
    },
    [uploadVideo, setVideoUploadStatus],
  );

  const { getInputProps, getRootProps } = useDropzone({
    accept: { "video/*": [] },
    multiple: false,
    onDrop,
  });

  const reset = () => {
    setVideoUploadStatus("idle");
    setPlaybackId(undefined);
    setFileName(undefined);
    onChange(undefined);
  };

  if (playbackId) {
    if (!showPreview) {
      return null;
    }
    return (
      <div className="flex flex-col gap-2">
        <div className="relative flex overflow-clip rounded-md border">
          <VideoPlayer playbackId={playbackId} />

          <Button
            className="absolute top-2 right-2"
            onClick={reset}
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
        <input
          {...getInputProps()}
          disabled={isUploading || isProcessing}
          id={formItemId}
        />
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
};
