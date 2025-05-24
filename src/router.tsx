import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import superjson from "superjson";

import { QueryClient } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getHeaders } from "@tanstack/react-start/server";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { TRPCProvider } from "~/integrations/trpc/react";
import { type TRPCRouter } from "~/integrations/trpc/router";
import { CatchBoundary } from "./components/catch-boundary";
import { NotFound } from "./components/not-found";
import { routeTree } from "./routeTree.gen";
import { setFlash } from "~/server/fns/session/flash/set";

const getUrl = () => {
  const base = (() => {
    if (typeof globalThis.window !== "undefined") return "";
    return `http://localhost:${process.env.PORT ?? 3000}`;
  })();
  return `${base}/api/trpc`;
};

const getIncomingHeaders = createIsomorphicFn()
  .client(() => ({
    "x-trpc-source": "client",
  }))
  .server(() => {
    const serverHeaders = getHeaders();
    return {
      ...serverHeaders,
      "x-trpc-source": "server",
    };
  });

export function createRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      dehydrate: { serializeData: superjson.serialize },
      hydrate: { deserializeData: superjson.deserialize },
    },
  });

  const trpcClient = createTRPCClient<TRPCRouter>({
    links: [
      httpBatchLink({
        // https://discord-questions.trpc.io/m/1354258180456321135
        headers: getIncomingHeaders,
        transformer: superjson,
        url: getUrl(),
      }),
    ],
  });

  const serverHelpers = createTRPCOptionsProxy({
    client: trpcClient,
    queryClient: queryClient,
  });

  const router = routerWithQueryClient(
    createTanStackRouter({
      routeTree,
      context: {
        trpc: serverHelpers,
        queryClient,
        session: {},
      },
      defaultPreload: "intent",
      // react-query will handle data fetching & caching
      // https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#passing-all-loader-events-to-an-external-cache
      defaultPreloadStaleTime: 0,

      scrollRestoration: true,
      // scroll to top of main tag in addition to window
      scrollToTopSelectors: ["main"],

      defaultErrorComponent: CatchBoundary,
      defaultNotFoundComponent: () => <NotFound />,

      defaultStructuralSharing: true,
      Wrap: (props) => (
        <TRPCProvider
          trpcClient={trpcClient}
          queryClient={queryClient}
          {...props}
        />
      ),
    }),
    queryClient,
  );

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
