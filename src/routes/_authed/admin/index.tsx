import * as Sentry from "@sentry/tanstackstart-react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { toast } from "sonner"

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

        {__COMMIT_SHA__ && __COMMIT_SHA__ !== "unknown" && (
          <div>
            <a
              href={`https://github.com/jrnxf/une.haus/commit/${__COMMIT_SHA__}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Badge variant="secondary" className="hover:bg-accent">
                {__COMMIT_SHA__}
              </Badge>
            </a>
          </div>
        )}

        <div>
          <Button
            variant="destructive"
            onClick={() => {
              const id = Sentry.captureException(new Error("sentry test error"))
              const url = `https://jrnxf.sentry.io/issues?query=id:${id}`
              toast(`sentry id (${id})`, {
                action: {
                  label: "view",
                  onClick: () => window.open(url, "_blank"),
                },
              })
            }}
          >
            throw error
          </Button>
        </div>
      </div>
    </>
  )
}
