import * as Sentry from "@sentry/tanstackstart-react"
import { createFileRoute, Link } from "@tanstack/react-router"

import { PageHeader } from "~/components/page-header"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
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

        <>
          {__COMMIT_SHA__ && __COMMIT_SHA__ !== "unknown" && (
            <a
              href={`https://github.com/jrnxf/une.haus/commit/${__COMMIT_SHA__}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Badge variant="secondary" className="hover:bg-accent">
                {__COMMIT_SHA__}
              </Badge>
            </a>
          )}
        </>

        <Button
          variant="destructive"
          onClick={() => {
            // Send a test metric before throwing the error
            Sentry.metrics.count("test_counter", 1)
            throw new Error("Sentry Test Error")
          }}
        >
          sentry error test
        </Button>
      </div>
    </>
  )
}
