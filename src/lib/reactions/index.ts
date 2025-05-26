import { likeRecordServerFn, unlikeRecordServerFn } from "~/lib/reactions/fns";
import { likeRecordSchema, unlikeRecordSchema } from "~/lib/reactions/schemas";

export const reactions = {
  like: {
    fn: likeRecordServerFn,
    schema: likeRecordSchema,
  },
  unlike: {
    fn: unlikeRecordServerFn,
    schema: unlikeRecordSchema,
  },
};
