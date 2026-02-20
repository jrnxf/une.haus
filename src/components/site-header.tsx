import { useRouter } from "@tanstack/react-router";
import { ChevronLeftIcon, MenuIcon } from "lucide-react";

import { useMobileNav } from "~/components/mobile-nav-context";
import { Button } from "~/components/ui/button";

export function MobileFooter() {
  const router = useRouter();
  const openNav = useMobileNav();

  return (
    <footer className="shrink-0 border-t md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => router.history.back()}
          aria-label="go back"
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={openNav}
          aria-label="Menu"
        >
          <MenuIcon />
        </Button>
      </div>
    </footer>
  );
}
