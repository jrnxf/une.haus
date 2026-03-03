import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeftRightIcon, MergeIcon } from "lucide-react"

import { StackItUpIcon } from "~/components/icons/stack-it-up-icon"
import { LinkCard } from "~/components/link-card"
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
        <PageHeader.Right>
          <PageHeader.Actions>
            <Button variant="secondary" asChild>
              <Link to="/games/arcade">arcade</Link>
            </Button>
          </PageHeader.Actions>
        </PageHeader.Right>
      </PageHeader>
      <div className="@container mx-auto w-full max-w-5xl p-4">
        <div className="flex flex-col gap-4 @2xl:flex-row">
          <LinkCard.Root href="/games/rius/active">
            <LinkCard.Header title="rack it up" icon={MergeIcon} />
            <LinkCard.Description>
              the original. post creative sets weekly, reply to others, and grow
              via feedback.
            </LinkCard.Description>
          </LinkCard.Root>

          <LinkCard.Root href="/games/bius">
            <LinkCard.Header title="back it up" icon={ArrowLeftRightIcon} />
            <LinkCard.Description>
              match the last trick, then set a new one. build an evolving chain
              of creativity.
            </LinkCard.Description>
          </LinkCard.Root>

          <LinkCard.Root href="/games/sius">
            <LinkCard.Header title="stack it up" icon={StackItUpIcon} />
            <LinkCard.Description>
              nail every trick in the stack then add your own to the end. keep
              the line going.
            </LinkCard.Description>
          </LinkCard.Root>
        </div>
      </div>
    </>
  )
}
