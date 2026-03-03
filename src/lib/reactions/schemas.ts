import { z } from "zod"

export const recordTypeWithLikes = [
  "chatMessage",
  "post",
  "postMessage",
  "riuSet",
  "riuSetMessage",
  "riuSubmission",
  "riuSubmissionMessage",
  "utvVideo",
  "utvVideoMessage",
  "biuSet",
  "biuSetMessage",
  "siuSet",
  "siuSetMessage",
] as const

export const recordTypeToLabel: Record<RecordWithLikesType, string> = {
  post: "post",
  postMessage: "message",
  chatMessage: "message",
  riuSet: "set",
  riuSetMessage: "riuSetMessage",
  riuSubmission: "submission",
  riuSubmissionMessage: "submissionMessage",
  utvVideo: "video",
  utvVideoMessage: "message",
  biuSet: "set",
  biuSetMessage: "biuSetMessage",
  siuSet: "set",
  siuSetMessage: "siuSetMessage",
}

export const baseSchema = z.object({
  recordId: z.number(), // the id of the thing receiving the message (in the case of chat just pass in -1 since there is no id)
  type: z.enum(recordTypeWithLikes),
})

export const likeRecordSchema = baseSchema
export const unlikeRecordSchema = baseSchema

export type RecordWithLikes = z.infer<typeof baseSchema>

export type RecordWithLikesType = RecordWithLikes["type"]
