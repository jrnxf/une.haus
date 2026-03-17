import * as Sentry from "@sentry/tanstackstart-react"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { type QueryClient } from "@tanstack/react-query"
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools"
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useLocation,
  useRouter,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { NuqsAdapter } from "nuqs/adapters/tanstack-router"
import { type ReactNode, useEffect, useState } from "react"
import { z } from "zod"

import { AppSidebar } from "~/components/app-sidebar"
import { ConfirmDialog } from "~/components/confirm-dialog"
import { GlobalShortcuts } from "~/components/global-shortcuts"
import { MobileBreadcrumbsProvider } from "~/components/mobile-breadcrumbs-context"
import {
  MobileNavIndent,
  MobileNavIndentBackground,
  MobileNavPopup,
  MobileNavProvider,
} from "~/components/mobile-nav"
import { MobileFooter } from "~/components/site-header"
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar"
import { Toaster } from "~/components/ui/sonner"
import { HapticsProvider } from "~/lib/haptics-provider"
import { presence } from "~/lib/presence"
import { useRootRouteContext } from "~/lib/session/hooks"
import { session } from "~/lib/session/index"
import { type HausSession } from "~/lib/session/schema"
import { ThemeProvider } from "~/lib/theme/context"
import { users } from "~/lib/users"
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

    await Promise.all([
      context.queryClient.ensureQueryData(users.all.queryOptions()),
      context.queryClient.ensureQueryData(presence.online.queryOptions()),
    ])

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
        charSet: "utf8",
      },
      {
        property: "og:site_name",
        content: "une.haus",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
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
      {
        name: "theme-color",
        content: "#000000",
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
      <RootDocument>
        <Outlet />
      </RootDocument>
    </NuqsAdapter>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter()
  const { session: sessionData } = useRootRouteContext()
  const location = useLocation()
  const isChromeless = location.pathname.startsWith("/intro")

  useEffect(() => {
    Sentry.setUser(sessionData.user ?? null)
  }, [sessionData.user])
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null,
  )

  return (
    <html
      lang="en"
      // necessary for theming - only applies one level (html tag)
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
      </head>
      <body className="overscroll-none font-mono antialiased">
        <ThemeProvider>
          <HapticsProvider>
            <Toaster />
            <ConfirmDialog />
            {isChromeless ? (
              <div className="relative h-dvh overflow-y-auto">{children}</div>
            ) : (
              <MobileNavProvider>
                <div ref={setPortalContainer} className="relative h-dvh">
                  <MobileNavIndentBackground />
                  <MobileNavIndent>
                    <MobileBreadcrumbsProvider>
                      <SidebarProvider
                        defaultOpen={sessionData.sidebarOpen}
                        style={
                          {
                            "--sidebar-width": "calc(var(--spacing) * 62)",
                            "--header-height": "calc(var(--spacing) * 12)",
                          } as React.CSSProperties
                        }
                      >
                        <GlobalShortcuts />
                        <AppSidebar variant="inset" />
                        <SidebarInset>
                          <div
                            className="flex flex-1 flex-col overflow-y-auto overscroll-none"
                            id="main-content"
                          >
                            {children}
                          </div>
                          <MobileFooter />
                        </SidebarInset>
                      </SidebarProvider>
                    </MobileBreadcrumbsProvider>
                  </MobileNavIndent>
                  <MobileNavPopup portalContainer={portalContainer} />
                </div>
              </MobileNavProvider>
            )}
          </HapticsProvider>
        </ThemeProvider>
        <TanStackDevtools
          config={{
            // hide it - our user profile opens it
            customTrigger: <></>,
          }}
          plugins={[
            {
              name: "TanStack Router",
              render: <TanStackRouterDevtoolsPanel router={router} />,
            },
            {
              name: "TanStack Query",
              render: <ReactQueryDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
