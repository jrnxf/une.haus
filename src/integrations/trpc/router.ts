import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { t } from "~/integrations/trpc/init";
import { authRouter } from "~/integrations/trpc/routers/auth";
import { emailRouter } from "~/integrations/trpc/routers/email";
import { gamesRouter } from "~/integrations/trpc/routers/games";
import { locationRouter } from "~/integrations/trpc/routers/location";
import { mediaRouter } from "~/integrations/trpc/routers/media";
import { messagesRouter } from "~/integrations/trpc/routers/messages";
import { postRouter } from "~/integrations/trpc/routers/post";
import { reactionRouter } from "~/integrations/trpc/routers/reaction";
import { sessionRouter } from "~/integrations/trpc/routers/session";
import { userRouter } from "~/integrations/trpc/routers/user";

export const trpcRouter = t.router({
  auth: authRouter,
  games: gamesRouter,
  location: locationRouter,
  media: mediaRouter,
  messages: messagesRouter,
  post: postRouter,
  reaction: reactionRouter,
  user: userRouter,
  session: sessionRouter,
  email: emailRouter,
});

export type TRPCRouter = typeof trpcRouter;

export type RouterInputs = inferRouterInputs<TRPCRouter>;
export type RouterOutputs = inferRouterOutputs<TRPCRouter>;
