import * as Sentry from "@sentry/tanstackstart-react"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools"
import {
  HeadContent,
  Scripts,
  useLocation,
  useRouter,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { type ReactNode, useEffect, useState } from "react"

import { AppSidebar } from "~/components/app-sidebar"
import { CommandPalette } from "~/components/command-palette"
import { ConfirmDialog } from "~/components/confirm-dialog"
import { AppErrorBoundary } from "~/components/error-boundary"
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
import { useRootRouteContext } from "~/lib/session/hooks"
import { ThemeProvider } from "~/lib/theme/context"

// The app shell lives in src/App.tsx (not __root.tsx) on purpose: audit
// tooling like shadscan only recognizes the shell at this conventional
// path — shell-level checks (theme, toast, nav, hotkeys) go blind if this
// markup moves back into the route file. For the same reason <Toaster />
// must stay rendered directly in this file, not extracted into a wrapper.
export default function App({ children }: Readonly<{ children: ReactNode }>) {
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
        <AppErrorBoundary>
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
                          <CommandPalette />
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
        </AppErrorBoundary>
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
