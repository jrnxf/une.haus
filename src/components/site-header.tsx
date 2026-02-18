import { Link, useRouter, type LinkProps } from "@tanstack/react-router";
import { ChevronLeftIcon, ChevronRight } from "lucide-react";

import { MobileNavTrigger } from "~/components/mobile-nav";
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
      className="flex items-center gap-1.5 text-xs md:text-sm"
    >
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="text-muted-foreground size-3.5" />}
          {crumb.to ? (
            <Link
              to={crumb.to as LinkProps["to"]}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {crumb.icon && <crumb.icon className="mr-1.5 inline size-3.5" />}
              {crumb.label}
            </Link>
          ) : (
            <span className="text-foreground flex items-center gap-1.5 font-medium">
              {crumb.icon && (
                <span className="bg-muted text-muted-foreground flex size-5 items-center justify-center rounded">
                  <crumb.icon className="size-3" />
                </span>
              )}
              {crumb.label}
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
            <span className="hidden md:inline">{tab.label}</span>
          </Link>
        );
      })}
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
      className="-ml-1 md:hidden"
      aria-label="go back"
    >
      <ChevronLeftIcon />
    </Button>
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
    <header className="order-last shrink-0 border-t md:order-first md:border-t-0 md:border-b">
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
          "mx-auto flex h-14 w-full items-center gap-2 px-4 md:h-(--header-height)",
          maxWidthClasses[headerState.maxWidth],
        )}
      >
        <div className="flex items-center gap-2">
          {hasBreadcrumbs && <MobileBackButton />}
          {hasTabs && (
            <div className="flex items-center gap-2 md:hidden">
              <Tabs tabs={headerState.tabs!} />
              {hasActions && <HeaderDivider />}
            </div>
          )}
          {hasActions && (
            <div className="flex items-center gap-2 md:hidden">
              {headerState.actions}
            </div>
          )}
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
              <div className="hidden md:block">
                <Breadcrumbs crumbs={headerState.breadcrumbs!} />
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
            <div className="hidden items-center gap-2 md:flex">
              <Tabs tabs={headerState.tabs!} />
              {hasActions && <HeaderDivider />}
            </div>
          )}
          {hasActions && (
            <div className="hidden items-center gap-2 md:flex">
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
