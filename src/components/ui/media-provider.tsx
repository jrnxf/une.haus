import React, { useState } from "react";

import { invariant } from "~/lib/invariant";

type VideoUploadStatus = "idle" | number;
type ImageUploadStatus = "idle" | "pending";

type MediaProviderProps = {
  imageUploadStatus: ImageUploadStatus;
  videoUploadStatus: VideoUploadStatus;
  setImageUploadStatus: (status: ImageUploadStatus) => void;
  setVideoUploadStatus: (status: VideoUploadStatus) => void;
  isMediaUploading: boolean;
};

const MediaContext = React.createContext<MediaProviderProps>({
  imageUploadStatus: "idle",
  setImageUploadStatus: () => ({}),
  setVideoUploadStatus: () => ({}),
  isMediaUploading: false,
  videoUploadStatus: "idle",
});

export const useMedia = () => {
  const context = React.useContext(MediaContext);
  invariant(context, "useMedia must be used within a MediaProvider");
  return context;
};

export function MediaProvider({ children }: { children: React.ReactNode }) {
  const [videoUploadStatus, setVideoUploadStatus] =
    useState<VideoUploadStatus>("idle");
  const [imageUploadStatus, setImageUploadStatus] =
    useState<ImageUploadStatus>("idle");

  return (
    <MediaContext.Provider
      value={{
        imageUploadStatus,
        videoUploadStatus,
        isMediaUploading:
          imageUploadStatus !== "idle" || videoUploadStatus !== "idle",
        setImageUploadStatus,
        setVideoUploadStatus,
      }}
    >
      {children}
    </MediaContext.Provider>
  );
}
