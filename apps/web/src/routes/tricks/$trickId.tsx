import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { GhostIcon } from "lucide-react"

import { PageHeader } from "~/components/page-header"
import { RichText } from "~/components/rich-text"
import { VideoCarousel } from "~/components/tricks/video-carousel"
import { Badge, badgeVariants } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { getMuxPoster } from "~/components/video-player"
import { seo } from "~/lib/seo"
import { session } from "~/lib/session"
import { tricks } from "~/lib/tricks"
import { users } from "~/lib/users"
import { DetailHeader } from "~/views/detail-header"

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
    const trick = loaderData?.graph?.byId[Number(params.trickId)]
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
  const trick = data.byId[Number(trickId)]

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
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tricks">tricks</PageHeader.Crumb>
          <PageHeader.Crumb>{trick.id}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="mx-auto w-full max-w-3xl p-4">
        <div className="space-y-6">
          <DetailHeader>
            <DetailHeader.Title>{trick.name}</DetailHeader.Title>
            <DetailHeader.Actions>
              <Button asChild size="sm">
                <Link
                  to={
                    isAdmin
                      ? "/admin/tricks/$trickId/edit"
                      : "/tricks/$trickId/suggest"
                  }
                  params={{ trickId: String(trick.id) }}
                >
                  edit
                </Link>
              </Button>
            </DetailHeader.Actions>
          </DetailHeader>

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
                {trick.alternateNames.map((name: string) => (
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
                {trick.elements.map((elem: string) => (
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
                    params={{ trickId: String(prerequisiteTrick.id) }}
                    className={badgeVariants({ variant: "secondary" })}
                  >
                    {prerequisiteTrick.name}
                  </Link>
                )}
                {optionalPrerequisiteTrick && (
                  <Link
                    to="/tricks/$trickId"
                    params={{ trickId: String(optionalPrerequisiteTrick.id) }}
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
        </div>
      </div>
    </>
  )
}
