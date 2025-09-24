import { enterCodeServerFn, sendMagicLinkServerFn } from "~/lib/email/fns";
import { enterCodeSchema, sendCodeSchema } from "~/lib/email/schemas";

export const email = {
  sendCode: {
    fn: sendMagicLinkServerFn,
    schema: sendCodeSchema,
  },
  enterCode: {
    fn: enterCodeServerFn,
    schema: enterCodeSchema,
  },
};
