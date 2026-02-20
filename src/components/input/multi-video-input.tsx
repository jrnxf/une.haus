import { Loader2Icon, Plus, TrashIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone-esm";

import pluralize from "pluralize";

import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { VideoPlayer } from "~/components/video-player";
import { useVideoUpload } from "~/lib/media";
import { cn } from "~/lib/utils";

type VideoItem = {
  assetId: string;
  playbackId: string;
};

type MultiVideoInputProps = {
  value: string[];
  onChange: (assetIds: string[]) => void;
  maxVideos?: number;
};

export function MultiVideoInput({
  value,
  onChange,
  maxVideos = 5,
}: MultiVideoInputProps) {
  const [uploadedVideos, setUploadedVideos] = useState<VideoItem[]>([]);
  const [currentFileName, setCurrentFileName] = useState<string>();
  const [isUploadActive, setIsUploadActive] = useState(false);

  const { uploadVideo, isUploading, uploadProgress, isProcessing } =
    useVideoUpload({
      onSuccess: (data) => {
        const newVideo = { assetId: data.assetId, playbackId: data.playbackId };
        setUploadedVideos((prev) => [...prev, newVideo]);
        onChange([...value, data.assetId]);
        setCurrentFileName(undefined);
        setIsUploadActive(false);
      },
      onError: () => {
        setCurrentFileName(undefined);
        setIsUploadActive(false);
      },
    });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const [file] = acceptedFiles;

      if (file && value.length < maxVideos) {
        setCurrentFileName(file.name);
        setIsUploadActive(true);
        uploadVideo(file);
      }
    },
    [uploadVideo, value.length, maxVideos],
  );

  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    accept: { "video/*": [] },
    multiple: false,
    onDrop,
    disabled: value.length >= maxVideos || isUploading || isProcessing,
  });

  const removeVideo = (index: number) => {
    const newAssetIds = value.filter((_, i) => i !== index);
    const newVideos = uploadedVideos.filter((_, i) => i !== index);
    setUploadedVideos(newVideos);
    onChange(newAssetIds);
  };

  const canAddMore = value.length < maxVideos && !isUploading && !isProcessing;

  return (
    <div className="space-y-3">
      {/* Uploaded videos preview */}
      {uploadedVideos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {uploadedVideos.map((video, index) => (
            <div
              key={video.assetId}
              className="relative overflow-clip rounded-md border"
            >
              <VideoPlayer className="w-full" playbackId={video.playbackId} />
              <Button
                className="absolute top-2 right-2"
                onClick={() => removeVideo(index)}
                type="button"
                size="icon-sm"
                variant="secondary"
              >
                <TrashIcon className="size-4" />
              </Button>
              <div className="bg-background/80 absolute bottom-2 left-2 rounded px-1.5 py-0.5 text-xs">
                Video {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {canAddMore && (
        <Button
          aria-label="file upload"
          className={cn(
            "border-border relative h-16 w-full overflow-hidden rounded-md border-2 border-dashed",
            isDragActive && "border-primary",
          )}
          type="button"
          variant="unstyled"
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Plus className="size-4" />
            <span>
              {currentFileName ?? `Add video (${value.length}/${maxVideos})`}
            </span>
          </div>

          {isUploadActive && isUploading && (
            <Progress
              value={uploadProgress}
              className="absolute bottom-0 h-1 rounded-none"
            />
          )}

          {isUploadActive && isProcessing && (
            <div className="text-muted-foreground absolute bottom-0.5 flex w-full items-center justify-center gap-1 text-xs font-medium">
              <span>processing</span>
              <Loader2Icon className="size-3 animate-spin" />
            </div>
          )}
        </Button>
      )}

      {/* Max reached indicator */}
      {!canAddMore && value.length >= maxVideos && (
        <p className="text-muted-foreground text-center text-sm">
          Maximum {maxVideos} {pluralize("video", maxVideos)} reached
        </p>
      )}
    </div>
  );
}
