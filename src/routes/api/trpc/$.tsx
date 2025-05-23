import { createAPIFileRoute } from "@tanstack/react-start/api";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { serialize, type SerializeOptions } from "cookie";
import { createTRPCContext } from "~/integrations/trpc/init";
import { trpcRouter } from "~/integrations/trpc/router";

function handler({ request }: { request: Request }) {
  return fetchRequestHandler({
    req: request,
    router: trpcRouter,
    endpoint: "/api/trpc",
    onError({ error }) {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        // TODO send to sentry
      }
    },

    createContext: async ({ req, resHeaders }) => {
      return createTRPCContext({
        req: { headers: req.headers },
        setCookie: (
          name: string,
          value: string,
          options?: SerializeOptions,
        ) => {
          resHeaders.append("Set-Cookie", serialize(name, value, options));
        },
        // res: { headers: resHeaders },
      });
    },
  });
}

export const APIRoute = createAPIFileRoute("/api/trpc/$")({
  GET: handler,
  POST: handler,
});
