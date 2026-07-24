import { type QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"
import { NuqsAdapter } from "nuqs/adapters/tanstack-router"
import { useEffect } from "react"
import { z } from "zod"

// the app shell (html/body, providers, sidebar chrome) lives in ~/App —
// see the comment there for why it is not defined in this file
import App from "../App"
import { session } from "~/lib/session/index"
import { type HausSession } from "~/lib/session/schema"
import appCss from "~/styles.css?url"

export interface RouterAppContext {
  session: HausSession
  queryClient: QueryClient
}

const rootSearchSchema = z.object({
  si: z.coerce.number().optional(),
  // p (peripherals) is managed by nuqs - array with - delimiter (e.g., ?p=sidebar-search)
  p: z.string().optional(),
})

export const Route = createRootRouteWithContext<RouterAppContext>()({
  validateSearch: rootSearchSchema,
  beforeLoad: async ({ context }) => {
    const sessionData = await context.queryClient.ensureQueryData(
      session.get.queryOptions(),
    )

    return { session: sessionData }
  },
  component: RootComponent,
  head: () => ({
    links: [
      {
        href: appCss,
        rel: "stylesheet",
      },
      {
        rel: "apple-touch-icon",
        href: "/icons/apple-touch-icon.png",
        sizes: "any",
      },
      {
        rel: "icon",
        href: "/icons/logo-white.svg",
        media: "(prefers-color-scheme: dark)",
        type: "image/svg+xml",
      },
      {
        rel: "icon",
        href: "/icons/logo-black.svg",
        media: "(prefers-color-scheme: light)",
        type: "image/svg+xml",
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
    ],
    meta: [
      {
        title: "une.haus",
      },
      {
        name: "description",
        content: "games, tricks, tourneys, and videos for the une community",
      },
      {
        charSet: "utf8",
      },
      {
        property: "og:site_name",
        content: "une.haus",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, maximum-scale=1",
      },
      {
        name: "apple-mobile-web-app-capable",
        content: "yes",
      },
      {
        name: "mobile-web-app-capable",
        content: "yes",
      },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
    ],
  }),
})

function RootComponent() {
  useEffect(() => {
    if (import.meta.env.DEV) {
      void import("react-grab")
    }
  }, [])

  return (
    <NuqsAdapter>
      <App>
        <Outlet />
      </App>
    </NuqsAdapter>
  )
}
