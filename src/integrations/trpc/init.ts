import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { type SerializeOptions } from "cookie";
import { db } from "~/db";
import { timingMiddleware } from "~/integrations/trpc/middleware";
import { type EnhancedErrorShape } from "~/integrations/trpc/types";
import { useServerSession } from "~/lib/session";
import { isDefined } from "~/lib/utils";

export const createTRPCContext = async (opts: {
  req: {
    headers: Headers;
  };
  setCookie: (name: string, value: string, options?: SerializeOptions) => void;
}) => {
  const session = await useServerSession();

  return {
    db,
    session: session.data,
    ...opts,
  };
};

/**
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
export const t = initTRPC.context<typeof createTRPCContext>().create({
  errorFormatter({ error, shape }) {
    const formattedError: EnhancedErrorShape = shape;

    if (error.cause instanceof ZodError) {
      formattedError.data.zodError = error.cause.flatten();
    }

    return formattedError;
  },
  transformer: superjson,
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Authenticated procedure
 *
 * This procedure ensures that the user is authenticated.
 */
export const authProcedure = t.procedure
  .use(async (opts) => {
    const sessionUser = opts.ctx.session.user;

    if (isDefined(sessionUser)) {
      return opts.next({
        ctx: {
          ...opts.ctx,
          session: {
            ...opts.ctx.session,
            user: sessionUser,
          },
        },
      });
    }

    throw new TRPCError({ code: "UNAUTHORIZED" });
  })
  .use(timingMiddleware);
