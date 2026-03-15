# Docs App Guidelines

## Framework

This is a TanStack Start app, NOT Next.js. Do not use any Next.js or React Server Components (RSC) patterns.

### Forbidden

- `async` components — TanStack Start does not support async/server components
- `"use client"` / `"use server"` directives — these are Next.js RSC concepts
- `next-themes` or any `next/*` imports
- `renderToString` or `react-dom/server` in client-accessible code
- `serializePageTree` / `useFumadocsLoader` from fumadocs — these rely on RSC internals (`renderToString`) that break on the client
- Any fumadocs API documented as "Next.js only"

### DocsLayout Pattern

The layout route (`docs/route.tsx`) owns `<DocsLayout>` with `source.getPageTree()` (synchronous). The page route (`docs/$.tsx`) only renders page content. Do not move `DocsLayout` into the page route or try to serialize the page tree in a loader.

## Mermaid

Mermaid diagrams use `beautiful-mermaid` with `renderMermaidSVG` (synchronous, not async). The `remarkMdxMermaid` remark plugin converts ` ```mermaid ` code blocks into `<Mermaid chart="..." />` at build time. The `Mermaid` component is a regular synchronous React component — not async.
