import { Link, useRouter } from "@tanstack/react-router";
import React from "react";

import { toast } from "sonner";

import { CommandMenu } from "~/components/command-menu";
import { MatrixText } from "~/components/matrix-text";
import { Button } from "~/components/ui/button";
import { SidebarTrigger } from "~/components/ui/sidebar";

export function SiteHeaderWeb() {
  const key = useBeforeLoadKey();
  return (
    <header className="hidden h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) sm:flex">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" size="icon-xs" />
        {/* TODO COLBY there are two of these in the dom bc of below - don't do this. FIX */}
        <CommandMenu key={key} />

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

export function SiteHeaderMobile() {
  const key = useBeforeLoadKey();
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b p-1 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) sm:hidden">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex w-full items-center justify-between gap-2">
          <CommandMenu key={key} />
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

function useBeforeLoadKey() {
  const router = useRouter();

  const [key, setKey] = React.useState(0);

  React.useEffect(() => {
    // This fires on router navigation (including back button within your SPA)
    const unsubscribe = router.subscribe("onBeforeLoad", () => {
      console.log("re-keying");
      toast.info("re-keying");
      setKey((key) => key + 1);
      // Close your sidebar here
    });

    return unsubscribe;
  }, [router]);

  return key;
}
