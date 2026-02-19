import { Link, useRouter, type LinkProps } from "@tanstack/react-router";
import { ChevronLeftIcon, ChevronRight, MenuIcon } from "lucide-react";

import { useMobileNav } from "~/components/mobile-nav-context";
import { Search } from "~/components/search";
import { Button } from "~/components/ui/button";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { useRoutePageHeader } from "~/lib/page-header/hooks";
import type { CrumbConfig, TabConfig } from "~/lib/page-header/types";
import { cn } from "~/lib/utils";

const maxWidthClasses = {
  lg: "md:max-w-lg",
  "2xl": "md:max-w-2xl",
  "4xl": "md:max-w-4xl",
  full: "",
} as const;

function HeaderDivider() {
  return <div className="bg-border h-4 w-px" />;
}

function Breadcrumbs({ crumbs }: { crumbs: CrumbConfig[] }) {
  return (
    <nav
      aria-label="breadcrumb"
      className="flex min-w-0 items-center gap-1.5 text-sm"
    >
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex min-w-0 items-center gap-1.5">
          {i > 0 && <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />}
          {crumb.to ? (
            <Link
              to={crumb.to as LinkProps["to"]}
              className="text-muted-foreground hover:text-foreground truncate transition-colors"
            >
              {crumb.icon && <crumb.icon className="mr-1.5 inline size-3.5" />}
              {crumb.label}
            </Link>
          ) : (
            <span className="text-foreground flex min-w-0 items-center gap-1.5 font-medium">
              {crumb.icon && (
                <span className="bg-muted text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded">
                  <crumb.icon className="size-3" />
                </span>
              )}
              <span className="truncate">{crumb.label}</span>
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

function Tabs({ tabs }: { tabs: (TabConfig & { isActive: boolean })[] }) {
  return (
    <nav className="flex gap-1" aria-label="Page sections">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={
              tab.isActive
                ? "bg-secondary text-foreground flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition-colors"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition-colors"
            }
          >
            {Icon && <Icon className="size-3.5" />}
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

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
        <Button variant="secondary" size="icon" onClick={openNav}>
          <MenuIcon />
        </Button>
      </div>
    </footer>
  );
}

export function SiteHeader() {
  const headerState = useRoutePageHeader();

  const showTrigger = true;
  const hasBreadcrumbs =
    headerState.breadcrumbs !== null && headerState.breadcrumbs.length > 0;
  const hasTabs = headerState.tabs !== null && headerState.tabs.length > 0;
  const hasActions = headerState.actions !== null;
  const hasWidget = headerState.widget !== null;
  const hasMobileRow = headerState.mobileRow !== null;

  return (
    <header className="shrink-0 border-b">
      {hasMobileRow && (
        <div
          className={cn(
            "mx-auto w-full border-b px-4 py-2 md:hidden",
            maxWidthClasses[headerState.maxWidth],
          )}
        >
          {headerState.mobileRow}
        </div>
      )}

      <div
        className={cn(
          "mx-auto flex h-(--header-height) w-full items-center gap-2 px-4",
          maxWidthClasses[headerState.maxWidth],
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {showTrigger && (
            <SidebarTrigger className="-ml-1 hidden md:flex" size="icon-xs" />
          )}
          {hasBreadcrumbs && (
            <>
              {showTrigger && (
                <div className="hidden md:block">
                  <HeaderDivider />
                </div>
              )}
              <Breadcrumbs crumbs={headerState.breadcrumbs!} />
            </>
          )}
          {hasWidget && (
            <>
              <HeaderDivider />
              {headerState.widget}
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {hasTabs && (
            <div className="flex items-center gap-2">
              <Tabs tabs={headerState.tabs!} />
              {hasActions && <HeaderDivider />}
            </div>
          )}
          {hasActions && (
            <div className="flex items-center gap-2">{headerState.actions}</div>
          )}
          <Search />
        </div>
      </div>
    </header>
  );
}
