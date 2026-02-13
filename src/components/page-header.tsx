import { Link, type LinkProps } from "@tanstack/react-router";
import { useLayoutEffect, type ReactNode } from "react";

import { usePageHeaderStore } from "~/lib/page-header/context";

// --- Slot collectors ---
// These components don't render anything visible.
// They're used to declaratively collect config for the header.

type CrumbProps = {
  to?: LinkProps["to"];
  icon?: React.ComponentType<{ className?: string }>;
  children: ReactNode;
};

function Crumb({ to, icon: Icon, children }: CrumbProps) {
  if (to) {
    return (
      <Link
        to={to}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        {Icon && <Icon className="mr-1.5 inline size-3.5" />}
        {children}
      </Link>
    );
  }

  return (
    <span className="text-foreground flex items-center gap-1.5 font-medium">
      {Icon && (
        <span className="bg-muted text-muted-foreground flex size-5 items-center justify-center rounded">
          <Icon className="size-3" />
        </span>
      )}
      {children}
    </span>
  );
}

type TabItem = {
  path: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

// --- Internal types for slot collection ---

type SlotState = {
  breadcrumbs: ReactNode | null;
  tabs: ReactNode | null;
  actions: ReactNode | null;
  widget: ReactNode | null;
  mobileRow: ReactNode | null;
};

// --- PageHeader root ---

type PageHeaderMaxWidth = "lg" | "2xl" | "4xl" | "full";

function PageHeaderRoot({
  children,
  maxWidth = "4xl",
}: {
  children: ReactNode;
  maxWidth?: PageHeaderMaxWidth;
}) {
  const store = usePageHeaderStore();

  // Walk children to extract slot content
  const slots: SlotState = {
    breadcrumbs: null,
    tabs: null,
    actions: null,
    widget: null,
    mobileRow: null,
  };

  // We use children as a declarative config — extract slot types
  const childArray = Array.isArray(children) ? children : [children];
  for (const child of childArray) {
    if (!child || typeof child !== "object" || !("type" in child)) continue;
    switch (child.type) {
      case Breadcrumbs: { slots.breadcrumbs = child; break; }
      case Tabs: { slots.tabs = child; break; }
      case Actions: { slots.actions = child; break; }
      case Widget: { slots.widget = child; break; }
      case MobileRow: { slots.mobileRow = child; break; }
    }
  }

  useLayoutEffect(() => {
    store.setState({ ...slots, maxWidth });
    return () => store.reset();
  });

  return null;
}

// --- Slot components ---

function Breadcrumbs({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function Tabs({
  items,
  isActive,
}: {
  items: TabItem[];
  isActive: (path: string) => boolean;
}) {
  return (
    <nav className="flex gap-1" aria-label="Page sections">
      {items.map((tab) => {
        const active = isActive(tab.path);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={
              active
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

function Actions({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function Widget({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function MobileRow({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// --- Compound export ---

export const PageHeader = Object.assign(PageHeaderRoot, {
  Breadcrumbs,
  Crumb,
  Tabs,
  Actions,
  Widget,
  MobileRow,
});
