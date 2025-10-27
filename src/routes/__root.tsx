import { type QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import { AppSidebar } from "~/components/app-sidebar";
import { CommandMenu } from "~/components/command-menu";
import { SectionCards } from "~/components/section-cards";
import { SiteHeader } from "~/components/site-header";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
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
      { href: appCss, rel: "stylesheet" },
      {
        as: "font",
        crossOrigin: "anonymous",
        href: "/fonts/geist-mono-variable.woff2",
        rel: "preload",
        type: "font/woff2",
      },
    ],
    meta: [
      { title: "une.haus" },
      { charSet: "utf8" },
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
      // light system
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
        // media: "(prefers-color-scheme: light)",
      },
      {
        name: "theme-color",
        content: "#ffffff",
        // media: "(prefers-color-scheme: light)",
      },
      // // dark system
      // {
      //   name: "theme-color",
      //   content: "#000000",
      //   media: "(prefers-color-scheme: dark)",
      // },
      // {
      //   name: "apple-mobile-web-app-status-bar-style",
      //   content: "black",
      //   media: "(prefers-color-scheme: dark)",
      // },
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
  return (
    <html
      lang="en"
      // necessary for theming - only applies one level (html tag)
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
      </head>
      <ThemeProvider>
        <body className="bg-background overflow-hidden font-mono">
          <CommandMenu />

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
        </body>
      </ThemeProvider>
      <Scripts />
    </html>
  );
}
