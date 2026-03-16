import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeftRightIcon, MergeIcon } from "lucide-react"

import { StackItUpIcon } from "~/components/icons/stack-it-up-icon"
import { PageHeader } from "~/components/page-header"
import { Button } from "~/components/ui/button"
import { games } from "~/lib/games"
import { seo } from "~/lib/seo"

import type { ComponentType } from "react"

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
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>games</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="@container mx-auto w-full max-w-2xl p-4">
        <div className="flex flex-col gap-4">
          <GameCard
            to="/games/rius/active"
            icon={MergeIcon}
            title="rack it up"
            description="the original. post up to three creative sets weekly and submit for all other rider sets. rider with the most points wins."
          />
          <GameCard
            to="/games/bius"
            icon={ArrowLeftRightIcon}
            title="back it up"
            description="back up the last trick then set a new one. the never-ending game."
          />
          <GameCard
            to="/games/sius"
            icon={StackItUpIcon}
            title="stack it up"
            description="land every trick in an ever-growing stack then set your own an the end. consistency wins."
          />
        </div>
      </div>
    </>
  )
}

type GameCardProps = {
  to: "/games/rius/active" | "/games/bius" | "/games/sius"
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}

function GameCard({ to, icon: Icon, title, description }: GameCardProps) {
  return (
    <Button variant="card" className="flex p-4" asChild>
      <Link to={to}>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <Icon className="text-muted-foreground size-3.5" />
            <p className="font-semibold">{title}</p>
          </div>
          <p className="text-muted-foreground min-w-0 flex-1 text-sm leading-relaxed">
            {description}
          </p>
        </div>
      </Link>
    </Button>
  )
}
