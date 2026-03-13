import * as Sentry from "@sentry/tanstackstart-react"
import { QueryClient } from "@tanstack/react-query"
import { createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import superjson from "superjson"

import { CatchBoundary } from "./components/catch-boundary"
import { NotFound } from "./components/not-found"
import { stringifySearch } from "./lib/url"
import { routeTree } from "./routeTree.gen"
import { isProduction } from "~/lib/env"

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
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
    // I had this set to "intent" but it doesn't seem to be as helpful on
    // mobile since there's no hover on mobile and it uses touch start events
    // which mean it doesn't really load fast enough
    defaultPreload: "intent",
    // react-query will handle data fetching & caching
    // https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#passing-all-loader-events-to-an-external-cache
    defaultPreloadStaleTime: 0,
    scrollRestoration: ({ location }) => !location.pathname.startsWith("/chat"),
    // scroll to top of main tag in addition to window
    scrollToTopSelectors: ["main"],

    defaultErrorComponent: CatchBoundary,
    defaultNotFoundComponent: () => <NotFound />,

    defaultStructuralSharing: true,

    // Keep commas and tildes readable in URLs (RFC 3986 compliant)
    stringifySearch,
  })

  setupRouterSsrQueryIntegration({ router, queryClient })

  if (!router.isServer) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      // enabled: isProduction,
      sendDefaultPii: true,
      integrations: [
        Sentry.tanstackRouterBrowserTracingIntegration(router),
        Sentry.replayIntegration(),
      ],
      enableLogs: true,
      environment: import.meta.env.VITE_ENVIRONMENT || "development",
      tracesSampleRate: isProduction ? 0.2 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    })
  }

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
