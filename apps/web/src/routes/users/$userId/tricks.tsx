import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { CheckIcon, ClockIcon, GhostIcon, VideoIcon } from "lucide-react"

import { PageHeader } from "~/components/page-header"
import { StatCard } from "~/components/stats/stat-card"
import { badgeVariants } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { Progress } from "~/components/ui/progress"
import { seo } from "~/lib/seo"
import { useSessionUser } from "~/lib/session/hooks"
import { session } from "~/lib/session/index"
import { tricks } from "~/lib/tricks"
import { users } from "~/lib/users"
import { errorFmt } from "~/lib/utils"

export const Route = createFileRoute("/users/$userId/tricks")({
  component: RouteComponent,
  params: users.get.schema,
  loader: async ({ context, params: { userId } }) => {
    try {
      const [user] = await Promise.all([
        context.queryClient.ensureQueryData(users.get.queryOptions({ userId })),
        context.queryClient.ensureQueryData(
          tricks.landings.forUser.queryOptions({ userId }),
        ),
        context.queryClient.ensureQueryData(tricks.graph.queryOptions()),
      ])
      return { user }
    } catch (error) {
      await session.flash.set.fn({
        data: { type: "error", message: errorFmt(error) },
      })
      throw redirect({ to: "/users" })
    }
  },
  head: ({ loaderData }) => {
    const user = loaderData?.user
    if (!user) return {}

    return seo({
      title: `${user.name} tricks`,
      description: `tricks landed by ${user.name} on une.haus`,
      path: `/users/${user.id}/tricks`,
    })
  },
})

function RouteComponent() {
  const { userId } = Route.useParams()
  const sessionUser = useSessionUser()
  const { data: landings } = useSuspenseQuery(
    tricks.landings.forUser.queryOptions({ userId }),
  )
  const { data: graph } = useSuspenseQuery(tricks.graph.queryOptions())

  const isOwnProfile = sessionUser?.id === userId
  const landingByTrickId = new Map(landings.map((l) => [l.trickId, l]))

  const total = graph.tricks.length
  const landedCount = graph.tricks.filter((t) =>
    landingByTrickId.has(t.id),
  ).length
  const activeCount = landings.filter((l) => l.status === "active").length
  const pendingCount = landings.filter((l) => l.status === "pending").length

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/users">users</PageHeader.Crumb>
          <PageHeader.Crumb to={`/users/${userId}`}>{userId}</PageHeader.Crumb>
          <PageHeader.Crumb>tricks</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
          {landings.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GhostIcon />
                </EmptyMedia>
                <EmptyTitle>no landed tricks</EmptyTitle>
                <EmptyDescription>
                  {isOwnProfile
                    ? "land a trick by proving it with video"
                    : "nothing landed yet"}
                </EmptyDescription>
              </EmptyHeader>
              {isOwnProfile && (
                <EmptyContent>
                  <Button asChild variant="outline">
                    <Link to="/tricks">browse</Link>
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-sm font-medium">progress</h2>
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {landedCount} / {total} landed
                  </span>
                </div>
                <Progress value={total > 0 ? (landedCount / total) * 100 : 0} />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <StatCard
                  label="landed"
                  value={landedCount}
                  icon={CheckIcon}
                  size="responsive"
                />
                <StatCard
                  label="active"
                  value={activeCount}
                  icon={VideoIcon}
                  size="responsive"
                />
                <StatCard
                  label="pending"
                  value={pendingCount}
                  icon={ClockIcon}
                  size="responsive"
                />
              </div>

              {/* Landed tricks grouped by element */}
              {graph.elements.map((element) => {
                const elementTricks = graph.byElement[element] ?? []
                const landed = elementTricks.filter((t) =>
                  landingByTrickId.has(t.id),
                )
                if (landed.length === 0) return null
                return (
                  <div key={element} className="space-y-2">
                    <h3 className="text-muted-foreground text-sm font-medium">
                      {element}{" "}
                      <span className="tabular-nums">
                        ({landed.length} / {elementTricks.length})
                      </span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {landed.map((trick) => {
                        const landing = landingByTrickId.get(trick.id)
                        return (
                          <Link
                            key={trick.id}
                            to="/tricks/$trickId"
                            params={{ trickId: String(trick.id) }}
                            className={badgeVariants({ variant: "secondary" })}
                          >
                            {trick.name}
                            {landing?.status === "pending" && (
                              <span className="text-muted-foreground">
                                pending
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
