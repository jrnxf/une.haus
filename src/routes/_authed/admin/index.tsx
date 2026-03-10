import { createFileRoute, Link } from "@tanstack/react-router"

import { PageHeader } from "~/components/page-header"
import { Badge } from "~/components/ui/badge"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"

export const Route = createFileRoute("/_authed/admin/")({
  loader: ({ context }) => {
    if (context.user.id !== 1) {
      throw new Error("Not authorized")
    }
  },
  component: RouteComponent,
})

const sections = [
  {
    title: "review",
    description: "moderate tricks, vault, and games",
    url: "/admin/review",
  },
  {
    title: "games",
    description: "start chains, rotate RIUs",
    url: "/admin/games",
  },
] as const

const buildInfo = [
  { label: "commit", value: __COMMIT_SHA__ },
  { label: "branch", value: __COMMIT_BRANCH__ },
  {
    label: "built",
    value: new Date(__BUILD_TIMESTAMP__).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  },
  { label: "env", value: import.meta.env.MODE },
]

function RouteComponent() {
  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>admin</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-4xl space-y-6 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <Link key={section.url} to={section.url}>
              <Card className="hover:bg-accent/50 py-4 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </div>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        <div className="space-y-2">
          {buildInfo.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                {item.label}
              </span>
              <Badge variant="secondary">{item.value}</Badge>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
