import { Link } from "@tanstack/react-router";

import { CommandMenu } from "~/components/command-menu";
import { MatrixText } from "~/components/matrix-text";
import { Button } from "~/components/ui/button";
import { SidebarTrigger } from "~/components/ui/sidebar";

export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 md:hidden" size="icon-xs" />
        {/* TODO COLBY there are two of these in the dom bc of below - don't do this. FIX */}
        <CommandMenu />

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" asChild size="sm">
            <Link to="/" className="dark:text-foreground">
              <MatrixText text="une.haus" dropHeight={24} />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
