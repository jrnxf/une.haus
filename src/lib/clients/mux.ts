import Mux from "@mux/mux-node";

import { env } from "~/lib/env";

export const muxClient = new Mux({
  tokenId: env.MUX_TOKEN_ID,
  tokenSecret: env.MUX_TOKEN_SECRET,
  webhookSecret: env.MUX_WEBHOOK_SECRET,
});
