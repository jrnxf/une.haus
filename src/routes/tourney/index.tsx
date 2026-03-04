import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { GhostIcon } from "lucide-react"

import { PageHeader } from "~/components/page-header"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import { seo } from "~/lib/seo"
import { useSessionUser } from "~/lib/session/hooks"
import { tourney } from "~/lib/tourney"

export const Route = createFileRoute("/tourney/")({
  component: RouteComponent,
  head: () =>
    seo({
      title: "tournaments",
      description: "unicycling tournaments on une.haus",
      path: "/tourney",
    }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(tourney.list.queryOptions())
  },
})

function RouteComponent() {
  const user = useSessionUser()
  const { data: tournaments } = useSuspenseQuery(tourney.list.queryOptions())

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>tourney</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        {user && (
          <PageHeader.Right>
            <PageHeader.Actions>
              <Button asChild>
                <Link to="/tourney/create">create</Link>
              </Button>
            </PageHeader.Actions>
          </PageHeader.Right>
        )}
      </PageHeader>

      <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-4 p-4">
        {tournaments.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <GhostIcon />
              </EmptyMedia>
              <EmptyTitle>no tournaments</EmptyTitle>
              <EmptyDescription>try again later</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          tournaments.map((t) => (
            <div key={t.id} className="relative">
              <div className="bg-card flex flex-col gap-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <Link
                    to="/tourney/live/$code"
                    params={{ code: t.code }}
                    className="truncate font-semibold after:absolute after:inset-0 after:rounded-md"
                  >
                    {t.name}
                  </Link>
                  <Badge variant="secondary">{t.code}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground relative z-10 inline-flex items-center gap-1.5 text-xs">
                    <RelativeTimeCard date={t.createdAt} variant="muted" />
                  </p>
                  {user?.id === t.createdByUserId && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        to={getPhaseRoute(t.phase)}
                        params={{ code: t.code }}
                        className="relative z-10"
                      >
                        manage
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}

function getPhaseRoute(
  phase: string,
):
  | "/tourney/$code/prelims"
  | "/tourney/$code/ranking"
  | "/tourney/$code/bracket" {
  switch (phase) {
    case "prelims": {
      return "/tourney/$code/prelims"
    }
    case "ranking": {
      return "/tourney/$code/ranking"
    }
    case "bracket":
    case "complete": {
      return "/tourney/$code/bracket"
    }
    default: {
      return "/tourney/$code/prelims"
    }
  }
}
