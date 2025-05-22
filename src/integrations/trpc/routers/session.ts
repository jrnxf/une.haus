import { type TRPCRouterRecord } from "@trpc/server";
import { publicProcedure } from "~/integrations/trpc/init";
import {
  decrypt,
  encrypt,
  serializeSession,
  HAUS_SESSION_KEY,
} from "~/lib/session";
import cookie from "cookie";
import { z } from "zod";

export const sessionRouter = {
  get: publicProcedure.query(async ({ ctx }) => {
    const cookieHeader = ctx.req.headers.get("cookie");
    const cookies = cookie.parse(cookieHeader ?? "");
    const session = await decrypt(cookies[HAUS_SESSION_KEY]);

    return (
      session ?? {
        user: undefined,
      }
    );
  }),
  setFlash: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const encryptedSession = await encrypt({
      ...ctx.session,
      flash: input,
    });
    const session = await serializeSession(encryptedSession);

    ctx.res.headers.set("set-cookie", session);

    console.log("resHeaders", Object.fromEntries(ctx.res.headers.entries()));

    return input;
  }),
} satisfies TRPCRouterRecord;
