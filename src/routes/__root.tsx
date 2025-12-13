import { type QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import { AppSidebar } from "~/components/app-sidebar";
import { SiteHeaderMobile, SiteHeaderWeb } from "~/components/site-header";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { Toaster } from "~/components/ui/sonner";
import { ConfirmDialog_ } from "~/lib/confirm-dialog";
import { useRootRouteContext } from "~/lib/session/hooks";
import { session } from "~/lib/session/index";
import { type HausSession } from "~/lib/session/schema";
import { ThemeProvider } from "~/lib/theme/context";
import appCss from "~/styles.css?url";

export interface RouterAppContext {
  session: HausSession;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  beforeLoad: async () => {
    const sessionData = await session.get.fn();
    return { session: sessionData };
  },
  component: RootComponent,
  head: () => ({
    links: [
      {
        href: appCss,
        rel: "stylesheet",
      },
      // {
      //   as: "font",
      //   crossOrigin: "anonymous",
      //   href: "/fonts/geist-mono-variable.woff2",
      //   rel: "preload",
      //   type: "font/woff2",
      // },

      {
        rel: "apple-touch-icon",
        href: "/icons/apple-touch-icon-180x180.png",
        sizes: "any",
      },
      {
        rel: "icon",
        href: "/icons/favicon.ico",
        sizes: "48x48",
      },
      {
        rel: "icon",
        href: "/icons/logo.svg",
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
        content: "width=device-width, initial-scale=1",
        name: "viewport",
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
        content: "#ffffff",
        media: "(prefers-color-scheme: light)",
      },
      {
        name: "theme-color",
        content: "#000000",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  }),
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  const { session } = useRootRouteContext();

  return (
    <html
      lang="en"
      // necessary for theming - only applies one level (html tag)
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
      </head>
      <body className="bg-sidebar font-mono antialiased">
        <ThemeProvider>
          <Toaster />
          <ConfirmDialog_ />

          <ReactQueryDevtools initialIsOpen={false} />

          {/* <div className="hidden sm:block"> */}
          <SidebarProvider
            defaultOpen={session.sidebarOpen}
            style={
              {
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)",
              } as React.CSSProperties
            }
          >
            <AppSidebar variant="inset" />
            <SidebarInset>
              <SiteHeaderWeb />
              <SiteHeaderMobile />

              {children}
            </SidebarInset>
          </SidebarProvider>
          {/* </div> */}
          {/* 
          <main className="bg-sidebar relative flex h-dvh w-full flex-col overflow-hidden p-0 transition-all sm:hidden sm:p-2">
            <div className="bg-background flex grow flex-col overflow-auto transition-all sm:rounded-xl sm:border">
              {children}
            </div>
          </main> */}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
