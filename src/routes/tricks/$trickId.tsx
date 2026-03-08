import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowRightIcon,
  GhostIcon,
  LayersIcon,
  LockOpenIcon,
  MapPinIcon,
} from "lucide-react"

import { PageHeader } from "~/components/page-header"
import { RichText } from "~/components/rich-text"
import { VideoCarousel } from "~/components/tricks/video-carousel"
import { Badge, badgeVariants } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { Separator } from "~/components/ui/separator"
import { getMuxPoster } from "~/components/video-player"
import { seo } from "~/lib/seo"
import { session } from "~/lib/session"
import { tricks } from "~/lib/tricks"
import { users } from "~/lib/users"

export const Route = createFileRoute("/tricks/$trickId")({
  loader: async ({ context }) => {
    const [graph, sessionData] = await Promise.all([
      context.queryClient.ensureQueryData(tricks.graph.queryOptions()),
      context.queryClient.ensureQueryData(session.get.queryOptions()),
      context.queryClient.ensureQueryData(users.all.queryOptions()),
    ])
    return {
      graph,
      isAdmin: sessionData.user?.id === 1,
    }
  },
  head: ({ loaderData, params }) => {
    const trick = loaderData?.graph?.byId[params.trickId]
    if (!trick) return {}

    const image = getMuxPoster({
      playbackId: trick.videos[0]?.playbackId,
      width: 1200,
    })

    return seo({
      title: trick.name,
      description: trick.description?.slice(0, 160) || "Trick on une.haus",
      path: `/tricks/${params.trickId}`,
      image,
      card: image ? "summary_large_image" : "summary",
    })
  },
  component: TrickDetailPage,
})

function TrickDetailPage() {
  const { isAdmin } = Route.useLoaderData()
  const { trickId } = Route.useParams()
  const { data } = useSuspenseQuery(tricks.graph.queryOptions())
  const { data: allUsers = [] } = useSuspenseQuery(users.all.queryOptions())
  const trick = data.byId[trickId]

  if (!trick) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <GhostIcon />
          </EmptyMedia>
          <EmptyTitle>trick not found</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link to="/tricks">back</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  const prerequisiteTrick = trick.prerequisite
    ? data.byId[trick.prerequisite]
    : null
  const optionalPrerequisiteTrick = trick.optionalPrerequisite
    ? data.byId[trick.optionalPrerequisite]
    : null

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tricks">tricks</PageHeader.Crumb>
          <PageHeader.Crumb>{trick.name}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="mx-auto w-full max-w-5xl p-4">
        <div className="space-y-6">
          {/* Hero: Name */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight">
                {trick.name}
              </h1>
            </div>
            <Button asChild size="sm">
              <Link
                to={
                  isAdmin
                    ? "/admin/tricks/$trickId/edit"
                    : "/tricks/$trickId/suggest"
                }
                params={{ trickId: trick.id }}
              >
                Edit
              </Link>
            </Button>
          </div>

          {/* Definition */}
          {trick.description && (
            <div className="space-y-2">
              <h3 className="text-muted-foreground text-sm font-medium">
                definition
              </h3>
              <RichText content={trick.description} className="text-sm" />
            </div>
          )}

          {/* Aka */}
          {trick.alternateNames.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-muted-foreground text-sm font-medium">aka</h3>
              <div className="flex flex-wrap gap-2">
                {trick.alternateNames.map((name) => (
                  <Badge key={name} variant="secondary">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Elements */}
          {trick.elements.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-muted-foreground text-sm font-medium">
                elements
              </h3>
              <div className="flex flex-wrap gap-2">
                {trick.elements.map((elem) => (
                  <Badge key={elem} variant="secondary">
                    {elem}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Prerequisites */}
          {(prerequisiteTrick || optionalPrerequisiteTrick) && (
            <div className="space-y-2">
              <h3 className="text-muted-foreground text-sm font-medium">
                prerequisites
              </h3>
              <div className="flex flex-wrap gap-2">
                {prerequisiteTrick && (
                  <Link
                    to="/tricks/$trickId"
                    params={{ trickId: prerequisiteTrick.id }}
                    className={badgeVariants({ variant: "secondary" })}
                  >
                    {prerequisiteTrick.name}
                  </Link>
                )}
                {optionalPrerequisiteTrick && (
                  <Link
                    to="/tricks/$trickId"
                    params={{ trickId: optionalPrerequisiteTrick.id }}
                    className={badgeVariants({ variant: "secondary" })}
                  >
                    {optionalPrerequisiteTrick.name}
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* History */}
          {(trick.inventedBy || trick.inventedByUserId || trick.yearLanded) && (
            <div className="space-y-2">
              <h3 className="text-muted-foreground text-sm font-medium">
                history
              </h3>
              <p className="text-sm">
                {(() => {
                  const inventorUser = trick.inventedByUserId
                    ? allUsers.find((u) => u.id === trick.inventedByUserId)
                    : null
                  const hasInventor = inventorUser || trick.inventedBy
                  return (
                    <>
                      {hasInventor && (
                        <span>
                          First landed by{" "}
                          {inventorUser ? (
                            <Link
                              to="/users/$userId"
                              params={{ userId: inventorUser.id }}
                              className="font-medium underline underline-offset-4"
                            >
                              {inventorUser.name}
                            </Link>
                          ) : (
                            trick.inventedBy
                          )}
                        </span>
                      )}
                      {hasInventor && trick.yearLanded && <span> in </span>}
                      {trick.yearLanded && <span>{trick.yearLanded}</span>}
                    </>
                  )
                })()}
              </p>
            </div>
          )}

          {/* Notes */}
          {trick.notes && (
            <div className="space-y-2">
              <h3 className="text-muted-foreground text-sm font-medium">
                notes
              </h3>
              <RichText content={trick.notes} className="text-sm" />
            </div>
          )}

          {/* Videos */}
          {trick.videos.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-muted-foreground text-sm font-medium">
                videos
              </h3>
              <div className="max-w-lg">
                <VideoCarousel videos={trick.videos} />
              </div>
            </div>
          )}

          {/* Composition (compound tricks) */}
          {trick.isCompound && trick.compositions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <LayersIcon className="text-muted-foreground size-4" />
                  composition
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-1">
                  {trick.compositions.map((comp, i) => (
                    <span
                      key={comp.position}
                      className="flex items-center gap-1"
                    >
                      {i > 0 && comp.catchType && (
                        <Badge variant="outline" className="text-xs">
                          {comp.catchType}
                        </Badge>
                      )}
                      {i > 0 && !comp.catchType && (
                        <ArrowRightIcon className="text-muted-foreground size-3" />
                      )}
                      <Button
                        className="h-auto px-2 py-1 text-sm"
                        variant="outline"
                        asChild
                      >
                        <Link
                          to="/tricks/$trickId"
                          params={{ trickId: comp.componentId }}
                        >
                          {comp.componentName}
                        </Link>
                      </Button>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Unlocks */}
          {trick.dependents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <LockOpenIcon className="text-muted-foreground size-4" />
                  unlocks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {trick.dependents.slice(0, 8).map((depId) => {
                    const depTrick = data.byId[depId]
                    if (!depTrick) return null
                    return (
                      <Button
                        key={depId}
                        className="h-auto px-2 py-1 text-sm"
                        variant="outline"
                        asChild
                      >
                        <Link to="/tricks/$trickId" params={{ trickId: depId }}>
                          {depTrick.name}
                        </Link>
                      </Button>
                    )
                  })}
                  {trick.dependents.length > 8 && (
                    <span className="text-muted-foreground self-center text-sm">
                      +{trick.dependents.length - 8} more
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Nearby (computed neighbors) */}
          {trick.neighbors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <MapPinIcon className="text-muted-foreground size-4" />
                  nearby
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {trick.neighbors.slice(0, 12).map((neighbor) => {
                    const neighborTrick = data.byId[neighbor.id]
                    if (!neighborTrick) return null
                    return (
                      <Button
                        key={neighbor.id}
                        className="h-auto px-2 py-1 text-sm"
                        variant="outline"
                        asChild
                      >
                        <Link
                          to="/tricks/$trickId"
                          params={{ trickId: neighbor.id }}
                        >
                          {neighborTrick.name}
                        </Link>
                      </Button>
                    )
                  })}
                  {trick.neighbors.length > 12 && (
                    <span className="text-muted-foreground self-center text-sm">
                      +{trick.neighbors.length - 12} more
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
