import {
  createCloudflareImagesDirectUploadServerFn,
  createPresignedMuxUrlServerFn,
  pollMuxVideoUploadStatusServerFn,
} from "~/lib/media/fns"

export const media = {
  createCloudflareImagesDirectUpload: {
    fn: createCloudflareImagesDirectUploadServerFn,
  },

  createPresignedMuxUrl: {
    fn: createPresignedMuxUrlServerFn,
  },

  pollMuxVideoUploadStatus: {
    fn: pollMuxVideoUploadStatusServerFn,
  },
}

export * from "~/lib/media/hooks"
