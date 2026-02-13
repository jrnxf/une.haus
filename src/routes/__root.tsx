import { TanStackDevtools } from "@tanstack/react-devtools";
import { type QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { BugIcon } from "lucide-react";
import { type ReactNode, useEffect } from "react";

import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { z } from "zod";

import { AppSidebar } from "~/components/app-sidebar";
import { ConfirmDialog } from "~/components/confirm-dialog";
import { GlobalShortcuts } from "~/components/global-shortcuts";
import { SiteHeader } from "~/components/site-header";
import { Button } from "~/components/ui/button";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { Toaster } from "~/components/ui/sonner";
import { PageHeaderProvider } from "~/lib/page-header/context";
import { useRootRouteContext } from "~/lib/session/hooks";
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
  beforeLoad: async ({ context }) => {
    const sessionData = await context.queryClient.ensureQueryData(
      session.get.queryOptions(),
    );
    return { session: sessionData };
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
    ],
  }),
});

function RootComponent() {
  useEffect(() => {
    if (import.meta.env.DEV) {
      void import("react-grab");
      void import("@react-grab/claude-code/client");
      void import("@react-grab/cursor/client");
    }
  }, []);

  return (
    <NuqsAdapter>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </NuqsAdapter>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const { session: sessionData } = useRootRouteContext();

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
        <ThemeProvider>
          <GlobalShortcuts />
          <Toaster />
          <ConfirmDialog />
          <SidebarProvider
            defaultOpen={sessionData.sidebarOpen}
            style={
              {
                "--sidebar-width": "calc(var(--spacing) * 62)",
                "--header-height": "calc(var(--spacing) * 12)",
              } as React.CSSProperties
            }
          >
            <AppSidebar variant="inset" />
            <PageHeaderProvider>
              <SidebarInset>
                <SiteHeader />
                <div className="flex-1 overflow-y-auto" id="main-content">
                  {children}
                </div>
              </SidebarInset>
            </PageHeaderProvider>
          </SidebarProvider>
        </ThemeProvider>
        <TanStackDevtools
          config={{
            position: "bottom-right",
            hideUntilHover: true,
            customTrigger: (
              <Button
                variant="outline"
                size="icon-sm"
                className="rounded-full"
              >
                <BugIcon className="size-4" />
              </Button>
            ),
          }}
          plugins={[
            {
              name: "TanStack Router",
              render: <TanStackRouterDevtoolsPanel router={router} />,
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
