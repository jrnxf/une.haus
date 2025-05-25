import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { t } from "~/integrations/trpc/init";
import { emailRouter } from "~/integrations/trpc/routers/email";
import { gamesRouter } from "~/integrations/trpc/routers/games";
import { locationRouter } from "~/integrations/trpc/routers/location";
import { mediaRouter } from "~/integrations/trpc/routers/media";
import { messagesRouter } from "~/integrations/trpc/routers/messages";
import { reactionRouter } from "~/integrations/trpc/routers/reaction";

export const trpcRouter = t.router({
  games: gamesRouter,
  location: locationRouter,
  media: mediaRouter,
  messages: messagesRouter,
  reaction: reactionRouter,
  email: emailRouter,
});

export type TRPCRouter = typeof trpcRouter;

export type RouterInputs = inferRouterInputs<TRPCRouter>;
export type RouterOutputs = inferRouterOutputs<TRPCRouter>;
