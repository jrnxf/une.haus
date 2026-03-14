import { createFileRoute, notFound } from "@tanstack/react-router"
import defaultMdxComponents from "fumadocs-ui/mdx"
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page"

import { source } from "~/lib/source"

export const Route = createFileRoute("/docs/$")({
  component: Page,
  loader: ({ params }) => {
    const slugs = params._splat?.split("/").filter(Boolean) ?? []
    const page = source.getPage(slugs)
    if (!page) throw notFound()
    return { slugs }
  },
})

function Page() {
  const { slugs } = Route.useLoaderData()
  const page = source.getPage(slugs)!
  const MDX = page.data.body

  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={{ ...defaultMdxComponents }} />
      </DocsBody>
    </DocsPage>
  )
}
