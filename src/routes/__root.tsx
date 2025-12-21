import { TanStackDevtools } from "@tanstack/react-devtools";
import { type QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { type ReactNode } from "react";

import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { z } from "zod";

import { AppSidebar } from "~/components/app-sidebar";
import { ConfirmDialog } from "~/components/confirm-dialog";
import { SafariSafeAreaFix } from "~/components/safari-safe-area-fix";
import { SiteHeader } from "~/components/site-header";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { Toaster } from "~/components/ui/sonner";
import { session } from "~/lib/session/index";
import { type HausSession } from "~/lib/session/schema";
import { ThemeProvider } from "~/lib/theme/context";
import appCss from "~/styles.css?url";

export interface RouterAppContext {
  session: HausSession;
  queryClient: QueryClient;
}

const rootSearchSchema = z.object({
  si: z.coerce.number().optional(),
  // p (peripherals) is managed by nuqs - array with - delimiter (e.g., ?p=sidebar-search)
  p: z.string().optional(),
});

export const Route = createRootRouteWithContext<RouterAppContext>()({
  validateSearch: rootSearchSchema,
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
        name: "viewport",
        content: "width=device-width, initial-scale=1",
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
    <NuqsAdapter>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </NuqsAdapter>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      // necessary for theming - only applies one level (html tag)
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
      </head>
      <body className="font-mono antialiased">
        <SafariSafeAreaFix />
        <ThemeProvider>
          <Toaster />
          <ConfirmDialog />
          <SidebarProvider
            style={
              {
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)",
              } as React.CSSProperties
            }
          >
            <AppSidebar variant="inset" />
            <SidebarInset>
              <SiteHeader />
              {children}
            </SidebarInset>
          </SidebarProvider>
        </ThemeProvider>
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            {
              name: "React Query",
              render: <ReactQueryDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
