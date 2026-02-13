import { ChevronRight } from "lucide-react";
import { Children, isValidElement, type ReactNode } from "react";

import { PageHeader } from "~/components/page-header";
import { Search } from "~/components/search";
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
      className="flex items-center gap-1.5 text-sm"
    >
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && (
            <ChevronRight className="text-muted-foreground size-3.5" />
          )}
          {crumb}
        </span>
      ))}
    </nav>
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
    <header className="shrink-0 border-b">
      <div className={cn("mx-auto flex h-(--header-height) w-full items-center gap-2 px-4 lg:px-6", maxWidthClasses[headerState.maxWidth])}>
        <div className="flex items-center gap-2">
          {showTrigger && (
            <SidebarTrigger className="-ml-1" size="icon-xs" />
          )}
          {hasBreadcrumbs && (
            <>
              {showTrigger && <HeaderDivider />}
              {renderBreadcrumbs(headerState.breadcrumbs)}
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
            <>
              {headerState.tabs}
              <HeaderDivider />
            </>
          )}
          {hasActions && (
            <>
              {headerState.actions}
              <HeaderDivider />
            </>
          )}
          <Search />
        </div>
      </div>

      {hasMobileRow && (
        <div className={cn("mx-auto w-full border-t px-4 py-2 md:hidden", maxWidthClasses[headerState.maxWidth])}>
          {headerState.mobileRow}
        </div>
      )}
    </header>
  );
}
