import { type QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { type TRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { type ReactNode } from "react";

import { AuthButton } from "~/components/auth-button";
import { CommandMenu } from "~/components/command-menu";
import { Button } from "~/components/ui/button";
import { Toaster } from "~/components/ui/sonner";
import { type TRPCRouter } from "~/integrations/trpc/router";
import { type HausSession } from "~/lib/session";
import { serverFn } from "~/server/fns/session/get";
import appCss from "~/styles.css?url";

export interface RouterAppContext {
  trpc: TRPCOptionsProxy<TRPCRouter>;
  session: HausSession;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  beforeLoad: async () => {
    const session = await serverFn();
    return { session };
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
      <body className="dark bg-background text-foreground flex min-h-dvh grow flex-col font-mono">
        {/* <SidebarProvider> */}
        {/* <AppSidebar /> */}
        <CommandMenu />

        <div className="flex grow flex-col" data-vaul-drawer-wrapper>
          <nav className="sticky top-0 z-10 flex w-full items-center gap-2 border-b bg-white px-4 py-1.5 dark:bg-[#0a0a0a]">
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
            <div className="grow" />
            <AuthButton />
          </nav>
          <main
            className="flex grow basis-0 flex-col overflow-y-auto"
            // https://tanstack.com/router/latest/docs/framework/react/guide/scroll-restoration#manual-scroll-restoration
            // I don't like the way the scroll restoration is automatically handled
            // here because on a refresh it loads at the top of the page and then
            // jumps to the restoration point (this may be a bug with the router) by
            // manually setting the scroll restoration id and then never registering
            // it with `useElementScrollRestoration` we effectively disable the
            // router's scroll restoration for this element. interestingly,
            // disabling the scroll restoration seems to still actually do the
            // scroll restoration but not cause the jump mentioned above.
            data-scroll-restoration-id="main"
          >
            {/* <SidebarTrigger /> */}
            {children}
          </main>
        </div>
        {/* </SidebarProvider> */}
        <ReactQueryDevtools buttonPosition="bottom-left" />

        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}
