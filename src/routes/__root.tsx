import { type QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import { AuthButton } from "~/components/auth-button";
import { CommandMenu } from "~/components/command-menu";
import { Button } from "~/components/ui/button";
import { Toaster } from "~/components/ui/sonner";
import { session } from "~/lib/session/index";
import { type HausSession } from "~/lib/session/schema";
import { cn } from "~/lib/utils";
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
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body
        className={cn(
          "dark",
          "bg-background text-foreground overflow-hidden font-mono",
        )}
      >
        <CommandMenu />

        <div
          className="grid h-dvh grid-rows-[auto_1fr]"
          data-vaul-drawer-wrapper
        >
          <nav className="flex w-full items-center gap-2 border-b bg-white px-4 py-1.5 dark:bg-[#0a0a0a]">
            <Button asChild variant="ghost">
              <Link className="[&.active]:bg-secondary" to="/chat">
                chat
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link className="[&.active]:bg-secondary" to="/posts">
                posts
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link className="[&.active]:bg-secondary" to="/users">
                users
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link className="[&.active]:bg-secondary" to="/games/rius/active">
                games
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link className="[&.active]:bg-secondary" to="/vault">
                vault
              </Link>
            </Button>
            <div className="grow" />
            <AuthButton />
          </nav>
          <main className="overflow-hidden">
            {/* overflow should be managed at the layout level */}
            {children}
          </main>
        </div>
        {/* <ReactQueryDevtools buttonPosition="bottom-left" /> */}

        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}
