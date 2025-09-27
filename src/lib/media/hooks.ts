import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import * as Upchunk from "@mux/upchunk";
import { toast } from "sonner";

import { media } from "~/lib/media";

export type VideoUploadOptions = {
  onSuccess?: (data: { assetId: string; playbackId: string }) => void;
  onError?: (error: unknown) => void;
  onProgress?: (progress: number) => void;
};

const CHUNK_SIZE = 5120;

export function useVideoUpload(options: VideoUploadOptions = {}) {
  const { onSuccess, onError, onProgress } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const { mutateAsync: pollMuxVideoUploadStatus } = useMutation({
    mutationFn: media.pollMuxVideoUploadStatus.fn,
  });

  const createPresignedMuxUrl = useMutation({
    mutationFn: media.createPresignedMuxUrl.fn,
  });

  const uploadVideo = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setUploadProgress(0);
      setIsProcessing(false);

      try {
        const presignedMuxUrl = await createPresignedMuxUrl.mutateAsync({});
        const { id: uploadId, url: presignedUrl } = presignedMuxUrl;

        const upload = Upchunk.createUpload({
          chunkSize: CHUNK_SIZE,
          endpoint: presignedUrl,
          file,
        });

        upload.on("error", (error) => {
          console.error("mux upload error", error.detail);
          const errorMessage =
            "Upload failed. Please try again and contact colby@jrnxf.co if the problem persists.";
          toast.error(errorMessage);
          onError?.(error);
          setIsUploading(false);
          setUploadProgress(0);
          setIsProcessing(false);
        });

        upload.on("progress", (progress) => {
          const progressValue = Math.trunc(progress.detail);
          setUploadProgress(progressValue);
          onProgress?.(progressValue);
        });

        upload.on("success", async () => {
          setIsProcessing(true);

          try {
            const data = await pollMuxVideoUploadStatus({
              data: { uploadId },
            });
            onSuccess?.(data);
          } catch (error) {
            console.error("Processing error:", error);
            toast.error("Video processing failed");
            onError?.(error);
          } finally {
            setIsUploading(false);
            setUploadProgress(0);
            setIsProcessing(false);
          }
        });
      } catch (error) {
        console.error("Upload setup error:", error);
        toast.error("Upload setup failed");
        onError?.(error);
        setIsUploading(false);
        setUploadProgress(0);
        setIsProcessing(false);
      }
    },
    [
      createPresignedMuxUrl,
      pollMuxVideoUploadStatus,
      onSuccess,
      onError,
      onProgress,
    ],
  );

  const reset = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(0);
    setIsProcessing(false);
  }, []);

  return {
    uploadVideo,
    isUploading,
    uploadProgress,
    isProcessing,
    reset,
  };
}
