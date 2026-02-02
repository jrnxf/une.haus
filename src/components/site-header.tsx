import { Link } from "@tanstack/react-router";

import { MatrixText } from "~/components/matrix-text";
import { Search } from "~/components/search";
import { Button } from "~/components/ui/button";
import { SidebarTrigger, useSidebar } from "~/components/ui/sidebar";

export function SiteHeader() {
  const { open, isMobile } = useSidebar();

  // Show trigger when sidebar is closed on desktop, or always on mobile
  const showTrigger = isMobile || !open;

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {showTrigger && <SidebarTrigger className="-ml-1" size="icon-xs" />}
        <Search />

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
