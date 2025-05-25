import { sendMagicLinkServerFn } from "~/lib/email/fns";
import { sendMagicLinkSchema } from "~/lib/email/schemas";

export const email = {
  sendMagicLink: {
    fn: sendMagicLinkServerFn,
    schema: sendMagicLinkSchema,
  },
};
