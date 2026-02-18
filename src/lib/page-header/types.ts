type CrumbConfig = {
  label: string;
  to?: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type TabConfig = {
  path: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type PageHeaderStaticConfig = {
  breadcrumbs?: CrumbConfig[];
  tabs?: TabConfig[];
  maxWidth?: "lg" | "2xl" | "4xl" | "full";
};

type PageHeaderLoaderData = {
  breadcrumbOverrides?: Record<number, { label?: string; to?: string }>;
};

declare module "@tanstack/router-core" {
  interface StaticDataRouteOption {
    pageHeader?: PageHeaderStaticConfig;
  }
}

export type {
  CrumbConfig,
  TabConfig,
  PageHeaderStaticConfig,
  PageHeaderLoaderData,
};
