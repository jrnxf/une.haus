import { MenuIcon } from "lucide-react"

import { useMobileBreadcrumbs } from "~/components/mobile-breadcrumbs-context"
import { useMobileNav } from "~/components/mobile-nav-context"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

export function MobileFooter() {
  const openNav = useMobileNav()
  const breadcrumbs = useMobileBreadcrumbs()

  return (
    <footer className="shrink-0 border-t md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="min-w-0 flex-1">{breadcrumbs}</div>
        <Button
          variant="secondary"
          size="icon"
          onClick={openNav}
          aria-label="menu"
          className={cn(
            "relative shrink-0",
            // Expand tap target with an invisible pseudo-element so the
            // button is easier to press on mobile (extra-wide on left
            // since it sits at the trailing edge of the footer).
            "before:absolute before:-inset-2 before:-left-4 before:content-['']",
          )}
        >
          <MenuIcon />
        </Button>
      </div>
    </footer>
  )
}
