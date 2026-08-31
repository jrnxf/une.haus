import { MenuIcon } from "lucide-react"

import { useMobileBreadcrumbs } from "~/components/mobile-breadcrumbs-context"
import { useMobileNav } from "~/components/mobile-nav-context"
import { Button } from "~/components/ui/button"

export function MobileFooter() {
  const openNav = useMobileNav()
  const breadcrumbs = useMobileBreadcrumbs()

  return (
    <footer className="shrink-0 border-t md:hidden">
      <div className="flex h-14 items-center justify-between gap-6 px-4">
        <div className="min-w-0 flex-1">{breadcrumbs}</div>
        <Button
          variant="secondary"
          size="icon"
          onClick={openNav}
          aria-label="menu"
          className="hit-area-y-2 hit-area-l-6 hit-area-r-4 shrink-0"
        >
          <MenuIcon />
        </Button>
      </div>
    </footer>
  )
}
