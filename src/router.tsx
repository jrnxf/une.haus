import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";

import superjson from "superjson";

import { CatchBoundary } from "./components/catch-boundary";
import { NotFound } from "./components/not-found";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      dehydrate: { serializeData: superjson.serialize },
      hydrate: { deserializeData: superjson.deserialize },
    },
  });

  const router = routerWithQueryClient(
    createTanStackRouter({
      routeTree,
      context: {
        queryClient,
        session: { theme: "dark", sidebarOpen: false },
        isMobile: true, // SSR default, will be overridden by beforeLoad
      },
      // I had this set to "intent" but it doesn't seem to be as helpful on
      // mobile since there's no hover on mobile and it uses touch start events
      // which mean it doesn't really load fast enough
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
    }),
    queryClient,
  );

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
