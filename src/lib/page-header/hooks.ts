import { useLocation, useMatches } from "@tanstack/react-router";

import { usePageHeaderStore } from "~/lib/page-header/context";
import type {
  CrumbConfig,
  PageHeaderLoaderData,
  TabConfig,
} from "~/lib/page-header/types";

type ResolvedPageHeader = {
  breadcrumbs: CrumbConfig[] | null;
  tabs: (TabConfig & { isActive: boolean })[] | null;
  maxWidth: "lg" | "2xl" | "4xl" | "full";
  actions: React.ReactNode | null;
  widget: React.ReactNode | null;
  mobileRow: React.ReactNode | null;
};

export function useRoutePageHeader(): ResolvedPageHeader {
  const matches = useMatches();
  const pathname = useLocation({ select: (l) => l.pathname });
  const store = usePageHeaderStore();

  // Find deepest match with staticData.pageHeader (iterate root->leaf, last wins)
  let breadcrumbs: CrumbConfig[] | null = null;
  let tabs: TabConfig[] | null = null;
  let maxWidth: "lg" | "2xl" | "4xl" | "full" = "full";
  let loaderOverrides:
    | Record<number, { label?: string; to?: string }>
    | undefined;

  for (const match of matches) {
    const config = (
      match.staticData as {
        pageHeader?: {
          breadcrumbs?: CrumbConfig[];
          tabs?: TabConfig[];
          maxWidth?: "lg" | "2xl" | "4xl" | "full";
        };
      }
    )?.pageHeader;
    if (config) {
      breadcrumbs = config.breadcrumbs ?? null;
      tabs = config.tabs ?? null;
      maxWidth = config.maxWidth ?? "full";
      // Check loaderData for dynamic label/to overrides
      const ld = (
        match.loaderData as
          | { pageHeader?: PageHeaderLoaderData }
          | undefined
      )?.pageHeader;
      loaderOverrides = ld?.breadcrumbOverrides;
    }
  }

  // Apply dynamic overrides (label and/or to)
  if (breadcrumbs && loaderOverrides) {
    breadcrumbs = breadcrumbs.map((crumb, i) => {
      const override = loaderOverrides![i];
      return override ? { ...crumb, ...override } : crumb;
    });
  }

  // Client-side store overrides (for routes with conditional breadcrumbs)
  if (store.breadcrumbs) {
    breadcrumbs = store.breadcrumbs;
  }
  if (store.maxWidth) {
    maxWidth = store.maxWidth;
  }

  // Derive tab isActive from pathname
  const resolvedTabs = tabs
    ? tabs.map((tab) => ({
        ...tab,
        isActive: pathname.startsWith(tab.path),
      }))
    : null;

  return {
    breadcrumbs,
    tabs: resolvedTabs,
    maxWidth,
    actions: store.actions,
    widget: store.widget,
    mobileRow: store.mobileRow,
  };
}
