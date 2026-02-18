import { useLayoutEffect, type ReactNode } from "react";

import { usePageHeaderStoreApi } from "~/lib/page-header/context";
import type { CrumbConfig } from "~/lib/page-header/types";

type MaxWidth = "lg" | "2xl" | "4xl" | "full";

function PageHeaderRoot({
  children,
  maxWidth,
  breadcrumbs,
}: {
  children?: ReactNode;
  maxWidth?: MaxWidth;
  breadcrumbs?: CrumbConfig[];
}) {
  const store = usePageHeaderStoreApi();

  const slots: {
    actions: ReactNode | null;
    widget: ReactNode | null;
    mobileRow: ReactNode | null;
    breadcrumbs: CrumbConfig[] | null;
    maxWidth: MaxWidth | null;
  } = {
    actions: null,
    widget: null,
    mobileRow: null,
    breadcrumbs: breadcrumbs ?? null,
    maxWidth: maxWidth ?? null,
  };

  if (children) {
    const childArray = Array.isArray(children) ? children : [children];
    for (const child of childArray) {
      if (!child || typeof child !== "object" || !("type" in child)) continue;
      switch (child.type) {
        case Actions: {
          slots.actions = child;
          break;
        }
        case Widget: {
          slots.widget = child;
          break;
        }
        case MobileRow: {
          slots.mobileRow = child;
          break;
        }
      }
    }
  }

  useLayoutEffect(() => {
    store.setState(slots);
    return () => store.reset();
  });

  return null;
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

export const PageHeader = Object.assign(PageHeaderRoot, {
  Actions,
  Widget,
  MobileRow,
});
