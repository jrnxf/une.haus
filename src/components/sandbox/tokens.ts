// The design tokens of src/styles.css, as static class strings so
// Tailwind sees every class. Keep this list in step with styles.css.

export type ColorToken = { name: string; swatch: string }

export const COLOR_GROUPS: { title: string; tokens: ColorToken[] }[] = [
  {
    title: "surfaces",
    tokens: [
      { name: "background", swatch: "bg-background" },
      { name: "foreground", swatch: "bg-foreground" },
      { name: "card", swatch: "bg-card" },
      { name: "card-2", swatch: "bg-card-2" },
      { name: "popover", swatch: "bg-popover" },
      { name: "muted", swatch: "bg-muted" },
      { name: "muted-foreground", swatch: "bg-muted-foreground" },
      { name: "accent", swatch: "bg-accent" },
      { name: "secondary", swatch: "bg-secondary" },
      { name: "table-header", swatch: "bg-table-header" },
      { name: "invert", swatch: "bg-invert" },
    ],
  },
  {
    title: "lines",
    tokens: [
      { name: "border", swatch: "bg-border" },
      { name: "input", swatch: "bg-input" },
      { name: "ring", swatch: "bg-ring" },
    ],
  },
  {
    title: "brand",
    tokens: [
      { name: "primary", swatch: "bg-primary" },
      { name: "primary-foreground", swatch: "bg-primary-foreground" },
      { name: "link", swatch: "bg-link" },
      { name: "mono", swatch: "bg-mono" },
      { name: "like", swatch: "bg-like" },
    ],
  },
  {
    title: "destructive",
    tokens: [
      { name: "destructive", swatch: "bg-destructive" },
      { name: "destructive-bg", swatch: "bg-destructive-bg" },
      { name: "destructive-bg-hover", swatch: "bg-destructive-bg-hover" },
      { name: "destructive-border", swatch: "bg-destructive-border" },
      { name: "destructive-ring", swatch: "bg-destructive-ring" },
    ],
  },
  {
    title: "success",
    tokens: [
      { name: "success", swatch: "bg-success" },
      { name: "success-bg", swatch: "bg-success-bg" },
      { name: "success-border", swatch: "bg-success-border" },
    ],
  },
  {
    title: "info",
    tokens: [
      { name: "info", swatch: "bg-info" },
      { name: "info-bg", swatch: "bg-info-bg" },
      { name: "info-border", swatch: "bg-info-border" },
    ],
  },
  {
    title: "warning",
    tokens: [
      { name: "warning", swatch: "bg-warning" },
      { name: "warning-bg", swatch: "bg-warning-bg" },
      { name: "warning-border", swatch: "bg-warning-border" },
    ],
  },
  {
    title: "charts",
    tokens: [
      { name: "chart-1", swatch: "bg-chart-1" },
      { name: "chart-2", swatch: "bg-chart-2" },
      { name: "chart-3", swatch: "bg-chart-3" },
      { name: "chart-4", swatch: "bg-chart-4" },
      { name: "chart-5", swatch: "bg-chart-5" },
    ],
  },
  {
    title: "ranks",
    tokens: [
      { name: "rank-gold", swatch: "bg-rank-gold" },
      { name: "rank-silver", swatch: "bg-rank-silver" },
      { name: "rank-bronze", swatch: "bg-rank-bronze" },
    ],
  },
  {
    title: "presence",
    tokens: [
      { name: "online", swatch: "bg-online" },
      { name: "away", swatch: "bg-away" },
      { name: "busy", swatch: "bg-busy" },
    ],
  },
  {
    title: "sidebar",
    tokens: [
      { name: "sidebar", swatch: "bg-sidebar" },
      { name: "sidebar-foreground", swatch: "bg-sidebar-foreground" },
      { name: "sidebar-primary", swatch: "bg-sidebar-primary" },
      { name: "sidebar-accent", swatch: "bg-sidebar-accent" },
      { name: "sidebar-border", swatch: "bg-sidebar-border" },
      { name: "sidebar-ring", swatch: "bg-sidebar-ring" },
    ],
  },
]

export const TYPE_SCALE = [
  { name: "text-2xs", className: "text-2xs" },
  { name: "text-xs", className: "text-xs" },
  { name: "text-sm", className: "text-sm" },
  { name: "text-base", className: "text-base" },
  { name: "text-lg", className: "text-lg" },
  { name: "text-xl", className: "text-xl" },
  { name: "text-2xl", className: "text-2xl" },
  { name: "text-3xl", className: "text-3xl" },
]

export const FONTS = [
  { name: "font-sans", className: "font-sans" },
  { name: "font-mono", className: "font-mono" },
]

export const RADII = [
  { name: "rounded-sm", className: "rounded-sm" },
  { name: "rounded-md", className: "rounded-md" },
  { name: "rounded-lg", className: "rounded-lg" },
  { name: "rounded-xl", className: "rounded-xl" },
  { name: "rounded-full", className: "rounded-full" },
]

// The spacing steps that CLAUDE.md allows for gaps and stacks.
export const SPACING = [
  { name: "1", className: "w-1" },
  { name: "2", className: "w-2" },
  { name: "3", className: "w-3" },
  { name: "4", className: "w-4" },
  { name: "6", className: "w-6" },
]

export const SHADOWS = [
  { name: "shadow-xs", className: "shadow-xs" },
  { name: "shadow-sm", className: "shadow-sm" },
  { name: "shadow-md", className: "shadow-md" },
  { name: "shadow-lg", className: "shadow-lg" },
  { name: "shadow-glow", className: "shadow-glow" },
]
