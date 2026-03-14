import { createFileRoute, Outlet } from "@tanstack/react-router"
import { DocsLayout } from "fumadocs-ui/layouts/docs"

import { source } from "~/lib/source"

export const Route = createFileRoute("/docs")({
  component: Layout,
})

function Layout() {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      nav={{ title: "une.haus", url: "/" }}
    >
      <Outlet />
    </DocsLayout>
  )
}
