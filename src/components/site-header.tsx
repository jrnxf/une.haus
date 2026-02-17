import { useRouter } from "@tanstack/react-router";
import { ChevronLeftIcon, ChevronRight } from "lucide-react";
import { Children, isValidElement, type ReactNode } from "react";

import { MobileNavTrigger } from "~/components/mobile-nav";
import { PageHeader } from "~/components/page-header";
import { Search } from "~/components/search";
import { Button } from "~/components/ui/button";
import { SidebarTrigger, useSidebar } from "~/components/ui/sidebar";
import { usePageHeader } from "~/lib/page-header/context";
import { cn } from "~/lib/utils";

const maxWidthClasses = {
  lg: "max-w-lg",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  full: "",
} as const;

function HeaderDivider() {
  return <div className="bg-border h-4 w-px" />;
}

function renderBreadcrumbs(breadcrumbsNode: ReactNode) {
  // Extract Crumb children from the Breadcrumbs wrapper
  const crumbs: ReactNode[] = [];
  if (isValidElement(breadcrumbsNode)) {
    const children = (breadcrumbsNode.props as { children?: ReactNode })
      .children;
    Children.forEach(children, (child) => {
      if (isValidElement(child) && child.type === PageHeader.Crumb) {
        crumbs.push(child);
      }
    });
  }

  if (crumbs.length === 0) return null;

  return (
    <nav
      aria-label="breadcrumb"
      className="flex items-center gap-1.5 text-xs lg:text-sm"
    >
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="text-muted-foreground size-3.5" />}
          {crumb}
        </span>
      ))}
    </nav>
  );
}

function MobileBackButton() {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      size="icon-sm"
      onClick={() => router.history.back()}
      className="-ml-1 lg:hidden"
      aria-label="go back"
    >
      <ChevronLeftIcon />
    </Button>
  );
}

export function SiteHeader() {
  const { open, isMobile } = useSidebar();
  const headerState = usePageHeader();

  const showTrigger = isMobile || !open;
  const hasBreadcrumbs = headerState.breadcrumbs !== null;
  const hasTabs = headerState.tabs !== null;
  const hasActions = headerState.actions !== null;
  const hasWidget = headerState.widget !== null;
  const hasMobileRow = headerState.mobileRow !== null;

  return (
    <header className="order-last shrink-0 border-t lg:order-first lg:border-t-0 lg:border-b">
      {hasMobileRow && (
        <div
          className={cn(
            "mx-auto w-full border-b px-4 py-2 lg:hidden",
            maxWidthClasses[headerState.maxWidth],
          )}
        >
          {headerState.mobileRow}
        </div>
      )}

      <div
        className={cn(
          "mx-auto flex h-14 w-full items-center gap-2 px-4 lg:h-(--header-height) lg:px-6",
          maxWidthClasses[headerState.maxWidth],
        )}
      >
        <div className="flex items-center gap-2">
          {hasBreadcrumbs && <MobileBackButton />}
          {hasTabs && (
            <div className="flex items-center gap-2 lg:hidden">
              {headerState.tabs}
              {hasActions && <HeaderDivider />}
            </div>
          )}
          {hasActions && (
            <div className="flex items-center gap-2 lg:hidden">
              {headerState.actions}
            </div>
          )}
          {showTrigger && (
            <SidebarTrigger className="-ml-1 hidden lg:flex" size="icon-xs" />
          )}
          {hasBreadcrumbs && (
            <>
              {showTrigger && (
                <div className="hidden lg:block">
                  <HeaderDivider />
                </div>
              )}
              <div className="hidden lg:block">
                {renderBreadcrumbs(headerState.breadcrumbs)}
              </div>
            </>
          )}
          {hasWidget && (
            <>
              <HeaderDivider />
              <div className="hidden md:block">{headerState.widget}</div>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {hasTabs && (
            <div className="hidden items-center gap-2 lg:flex">
              {headerState.tabs}
              {hasActions && <HeaderDivider />}
            </div>
          )}
          {hasActions && (
            <div className="hidden items-center gap-2 lg:flex">
              {headerState.actions}
            </div>
          )}
          <Search />
          <MobileNavTrigger />
        </div>
      </div>
    </header>
  );
}
