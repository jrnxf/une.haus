import { Link, useLocation, type LinkProps } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Children, type ReactNode } from "react";

import { Search } from "~/components/search";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { cn } from "~/lib/utils";

function HeaderDivider() {
  return <div className="bg-border h-4 w-px" />;
}

function PageHeaderRoot({
  children,
  maxWidth,
}: {
  children?: ReactNode;
  maxWidth?: string;
}) {
  let breadcrumbs: ReactNode | null = null;
  let tabs: ReactNode | null = null;
  let actions: ReactNode | null = null;
  const otherChildren: ReactNode[] = [];

  if (children) {
    const childArray = Array.isArray(children) ? children : [children];
    for (const child of childArray) {
      if (!child || typeof child !== "object" || !("type" in child)) {
        otherChildren.push(child);
        continue;
      }
      switch (child.type) {
        case Breadcrumbs: {
          breadcrumbs = child;
          break;
        }
        case Tabs: {
          tabs = child;
          break;
        }
        case Actions: {
          actions = child;
          break;
        }
        default: {
          otherChildren.push(child);
          break;
        }
      }
    }
  }

  return (
    <header className="bg-background sticky top-0 z-30 shrink-0 border-b">
      <div
        className={cn(
          "mx-auto flex h-(--header-height) w-full items-center gap-2 px-4",
          maxWidth,
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="-ml-1 hidden md:flex" size="icon-xs" />
          {breadcrumbs && (
            <>
              <div className="hidden md:block">
                <HeaderDivider />
              </div>
              {breadcrumbs}
            </>
          )}
          {otherChildren.length > 0 && (
            <>
              <HeaderDivider />
              {otherChildren}
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {tabs && (
            <div className="flex items-center gap-2">
              {tabs}
              {actions && <HeaderDivider />}
            </div>
          )}
          {actions && (
            <div className="flex items-center gap-2">{actions}</div>
          )}
          <Search />
        </div>
      </div>
    </header>
  );
}

function Breadcrumbs({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  return (
    <nav
      aria-label="breadcrumb"
      className="flex min-w-0 items-center gap-1.5 text-sm"
    >
      {items.map((child, i) => (
        <span key={i} className="flex min-w-0 items-center gap-1.5">
          {i > 0 && (
            <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
          )}
          {child}
        </span>
      ))}
    </nav>
  );
}

function Crumb({
  to,
  icon: Icon,
  children,
}: {
  to?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  if (to) {
    return (
      <Link
        to={to as LinkProps["to"]}
        className="text-muted-foreground hover:text-foreground truncate transition-colors"
      >
        {Icon && <Icon className="mr-1.5 inline size-3.5" />}
        {children}
      </Link>
    );
  }
  return (
    <span className="text-foreground flex min-w-0 items-center gap-1.5 font-medium">
      {Icon && (
        <span className="bg-muted text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded">
          <Icon className="size-3" />
        </span>
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}

function Tabs({ children }: { children: ReactNode }) {
  return (
    <nav className="flex gap-1" aria-label="Page sections">
      {children}
    </nav>
  );
}

function Tab({
  to,
  icon: Icon,
  children,
}: {
  to: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  const pathname = useLocation({ select: (l) => l.pathname });
  const isActive = pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={
        isActive
          ? "bg-secondary text-foreground flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition-colors"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition-colors"
      }
    >
      {Icon && <Icon className="size-3.5" />}
      <span>{children}</span>
    </Link>
  );
}

function Actions({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export const PageHeader = Object.assign(PageHeaderRoot, {
  Breadcrumbs,
  Crumb,
  Tabs,
  Tab,
  Actions,
});
