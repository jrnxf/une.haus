import * as Sentry from "@sentry/tanstackstart-react"
import { QueryClient } from "@tanstack/react-query"
import { createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import superjson from "superjson"

import { CatchBoundary } from "./components/catch-boundary"
import { NotFound } from "./components/not-found"
import { SuspenseLoader } from "./components/suspense-loader"
import { stringifySearch } from "./lib/url"
import { routeTree } from "./routeTree.gen"
import { isProduction } from "~/lib/env"

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      // Bounds refetch chatter from viewport preloading. Stale-after-edit
      // flashes are prevented by mutation-side removeQueries/optimistic
      // updates (see CLAUDE.md), not by staleTime.
      queries: { staleTime: 30 * 1000 },
      dehydrate: { serializeData: superjson.serialize },
      hydrate: { deserializeData: superjson.deserialize },
    },
  })

  const router = createRouter({
    routeTree,
    context: {
      queryClient,
      session: { theme: "dark", sidebarOpen: false },
    },
    // "intent" only helps on desktop hover; on mobile touchstart fires too
    // late. "viewport" preloads route chunks + loader data for every link
    // as it scrolls into view, so taps hit a warm cache.
    defaultPreload: "viewport",
    // react-query owns data caching, but throttle loader re-runs from
    // viewport intersection jitter while scrolling
    // https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#passing-all-loader-events-to-an-external-cache
    defaultPreloadStaleTime: 30 * 1000,
    scrollRestoration: ({ location }) => !location.pathname.startsWith("/chat"),
    // scroll to top of main tag in addition to window
    scrollToTopSelectors: ["main"],

    defaultErrorComponent: CatchBoundary,
    defaultNotFoundComponent: () => <NotFound />,
    defaultPendingComponent: SuspenseLoader,

    defaultStructuralSharing: true,

    // Keep commas and tildes readable in URLs (RFC 3986 compliant)
    stringifySearch,
  })

  setupRouterSsrQueryIntegration({ router, queryClient })

  if (!router.isServer) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      enabled: isProduction,
      sendDefaultPii: true,
      integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
      enableLogs: true,
      environment: import.meta.env.VITE_ENVIRONMENT || "development",
      tracesSampleRate: isProduction ? 0.2 : 1.0,
      ignoreErrors: [/not found/i, /access denied/i],
    })
  }

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
