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
import {
  SidebarInset,
  SidebarProvider,
  SidebarRail,
} from "~/components/ui/sidebar";
import { Toaster } from "~/components/ui/sonner";
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
        name: "apple-mobile-web-app-status-bar-style",
        content: "#ffffff",
      },
      {
        name: "theme-color",
        content: "#ffffff",
      },
      // dark system
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
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
  return (
    <html
      lang="en"
      // necessary for theming - only applies one level (html tag)
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
      </head>
      <body className="overflow-hidden bg-blue-200 font-mono">
        <ThemeProvider>
          <CommandMenu />
          <SidebarProvider>
            <AppSidebar />
            <SidebarRail />
            <SidebarInset>
              {/* <nav className="flex w-full items-center gap-2 border-b bg-white px-4 py-1.5 dark:bg-[#0a0a0a]">
                    <Button asChild variant="ghost">
                      <Link className="[&.active]:bg-secondary" to="/chat">
                        c
                      </Link>
                    </Button>
                    <Button asChild variant="ghost">
                      <Link className="[&.active]:bg-secondary" to="/posts">
                        p
                      </Link>
                    </Button>
                    <Button asChild variant="ghost">
                      <Link className="[&.active]:bg-secondary" to="/users">
                        u
                      </Link>
                    </Button>
                    <Button asChild variant="ghost">
                      <Link
                        className="[&.active]:bg-secondary"
                        to="/games/rius/active"
                      >
                        g
                      </Link>
                    </Button>
                    <Button asChild variant="ghost">
                      <Link className="[&.active]:bg-secondary" to="/vault">
                        v
                      </Link>
                    </Button>
                    <Button asChild variant="ghost">
                      <Link className="[&.active]:bg-secondary" to="/sandbox">
                        s
                      </Link>
                    </Button>
                    <div className="grow" />
                    <AuthButton />
                  </nav> */}
              {/* overflow should be managed at the layout level */}
              {children}
              {/* <ReactQueryDevtools buttonPosition="bottom-left" /> */}
              <Toaster />
            </SidebarInset>
          </SidebarProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
