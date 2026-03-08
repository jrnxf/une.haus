import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeftRightIcon, MergeIcon } from "lucide-react"

import { StackItUpIcon } from "~/components/icons/stack-it-up-icon"
import { PageHeader } from "~/components/page-header"
import { Button } from "~/components/ui/button"
import { games } from "~/lib/games"
import { seo } from "~/lib/seo"

export const Route = createFileRoute("/games/")({
  component: RouteComponent,
  head: () =>
    seo({
      title: "games",
      description: "unicycling games on une.haus",
      path: "/games",
    }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        games.rius.active.list.queryOptions(),
      ),
      context.queryClient.ensureQueryData(
        games.rius.upcoming.roster.queryOptions(),
      ),
      context.queryClient.ensureQueryData(games.bius.rounds.queryOptions()),
      context.queryClient.ensureQueryData(
        games.sius.rounds.active.queryOptions(),
      ),
    ])
  },
})

function RouteComponent() {
  useSuspenseQuery(games.rius.active.list.queryOptions())
  useSuspenseQuery(games.rius.upcoming.roster.queryOptions())
  useSuspenseQuery(games.bius.rounds.queryOptions())
  useSuspenseQuery(games.sius.rounds.active.queryOptions())

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>games</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="@container mx-auto w-full max-w-5xl p-4">
        <div className="flex flex-col gap-4 @2xl:flex-row">
          <Button variant="card" className="flex p-4" asChild>
            <Link to="/games/rius/active">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <MergeIcon className="text-muted-foreground size-4" />
                  <p className="font-semibold">rack it up</p>
                </div>
                <p className="text-muted-foreground min-w-0 flex-1 text-sm leading-relaxed">
                  the original. post creative sets weekly, reply to others, and
                  grow via feedback.
                </p>
              </div>
            </Link>
          </Button>

          <Button variant="card" className="flex p-4" asChild>
            <Link to="/games/bius">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <ArrowLeftRightIcon className="text-muted-foreground size-4" />
                  <p className="font-semibold">back it up</p>
                </div>
                <p className="text-muted-foreground min-w-0 flex-1 text-sm leading-relaxed">
                  match the last trick, then set a new one. build an evolving
                  chain of creativity.
                </p>
              </div>
            </Link>
          </Button>

          <Button variant="card" className="flex p-4" asChild>
            <Link to="/games/sius">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <StackItUpIcon className="text-muted-foreground size-4" />
                  <p className="font-semibold">stack it up</p>
                </div>
                <p className="text-muted-foreground min-w-0 flex-1 text-sm leading-relaxed">
                  nail every trick in the stack then add your own to the end.
                  keep the line going.
                </p>
              </div>
            </Link>
          </Button>
        </div>
      </div>
    </>
  )
}
