import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  GhostIcon,
  HistoryIcon,
  LayersIcon,
  LockOpenIcon,
  MapPinIcon,
  ShieldIcon,
  StickyNoteIcon,
} from "lucide-react";

import { PageHeader } from "~/components/page-header";
import { VideoCarousel } from "~/components/tricks/video-carousel";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { Separator } from "~/components/ui/separator";
import { session } from "~/lib/session";
import { tricks } from "~/lib/tricks";

export const Route = createFileRoute("/tricks/$trickId")({
  loader: async ({ context }) => {
    const [, sessionData] = await Promise.all([
      context.queryClient.ensureQueryData(tricks.graph.queryOptions()),
      context.queryClient.ensureQueryData(session.get.queryOptions()),
    ]);
    return {
      isAdmin: sessionData.user?.id === 1,
    };
  },
  component: TrickDetailPage,
});

function TrickDetailPage() {
  const { isAdmin } = Route.useLoaderData();
  const { trickId } = Route.useParams();
  const { data } = useSuspenseQuery(tricks.graph.queryOptions());
  const trick = data.byId[trickId];

  if (!trick) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <GhostIcon />
          </EmptyMedia>
          <EmptyTitle>Trick not found</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link to="/tricks">Back</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const prerequisiteTrick = trick.prerequisite
    ? data.byId[trick.prerequisite]
    : null;
  const optionalPrerequisiteTrick = trick.optionalPrerequisite
    ? data.byId[trick.optionalPrerequisite]
    : null;

  return (
    <>
      <PageHeader maxWidth="max-w-4xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tricks">tricks</PageHeader.Crumb>
          <PageHeader.Crumb>{trick.name}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Actions>
          <Button asChild size="sm">
            <Link to="/tricks/$trickId/suggest" params={{ trickId: trick.id }}>
              Edit
            </Link>
          </Button>
          {isAdmin && (
            <Button asChild variant="secondary" size="icon-xs">
              <Link
                to="/admin/tricks/$trickId/edit"
                params={{ trickId: trick.id }}
              >
                <ShieldIcon className="size-3.5" />
              </Link>
            </Button>
          )}
        </PageHeader.Actions>
      </PageHeader>

      <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
        <div className="space-y-6">
          {/* Hero: Name + Aliases */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{trick.name}</h1>
            {trick.alternateNames.length > 0 && (
              <p className="text-muted-foreground mt-1 text-sm">
                aka {trick.alternateNames.join(", ")}
              </p>
            )}
          </div>

          {/* Videos */}
          {trick.videos.length > 0 && <VideoCarousel videos={trick.videos} />}

          {/* Definition */}
          {trick.definition && (
            <p className="text-base leading-relaxed">{trick.definition}</p>
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

          {/* Composition (compound tricks) */}
          {trick.isCompound && trick.compositions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
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

          {/* Progression: Prerequisites + Unlocks */}
          {(prerequisiteTrick ||
            optionalPrerequisiteTrick ||
            trick.dependents.length > 0) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Prerequisites */}
                {(prerequisiteTrick || optionalPrerequisiteTrick) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">prerequisites</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {prerequisiteTrick && (
                          <Button
                            className="h-auto px-2 py-1 text-sm"
                            variant="outline"
                            asChild
                          >
                            <Link
                              to="/tricks/$trickId"
                              params={{ trickId: prerequisiteTrick.id }}
                            >
                              {prerequisiteTrick.name}
                            </Link>
                          </Button>
                        )}
                        {optionalPrerequisiteTrick && (
                          <Button
                            className="h-auto px-2 py-1 text-sm"
                            variant="outline"
                            asChild
                          >
                            <Link
                              to="/tricks/$trickId"
                              params={{ trickId: optionalPrerequisiteTrick.id }}
                            >
                              {optionalPrerequisiteTrick.name}
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Unlocks */}
                {trick.dependents.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <LockOpenIcon className="text-muted-foreground size-4" />
                        unlocks
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {trick.dependents.slice(0, 8).map((depId) => {
                          const depTrick = data.byId[depId];
                          if (!depTrick) return null;
                          return (
                            <Button
                              key={depId}
                              className="h-auto px-2 py-1 text-sm"
                              variant="outline"
                              asChild
                            >
                              <Link
                                to="/tricks/$trickId"
                                params={{ trickId: depId }}
                              >
                                {depTrick.name}
                              </Link>
                            </Button>
                          );
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
              </div>
            )}

          {/* Nearby (computed neighbors) */}
          {trick.neighbors.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <MapPinIcon className="text-muted-foreground size-4" />
                  nearby
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {trick.neighbors.slice(0, 12).map((neighbor) => {
                    const neighborTrick = data.byId[neighbor.id];
                    if (!neighborTrick) return null;
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
                    );
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

          {/* History + Notes footer */}
          {(trick.inventedBy || trick.yearLanded || trick.notes) && (
            <>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                {(trick.inventedBy || trick.yearLanded) && (
                  <div className="flex gap-2">
                    <HistoryIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <p className="text-sm">
                      {trick.inventedBy && (
                        <span>First landed by {trick.inventedBy}</span>
                      )}
                      {trick.inventedBy && trick.yearLanded && (
                        <span> in </span>
                      )}
                      {trick.yearLanded && <span>{trick.yearLanded}</span>}
                    </p>
                  </div>
                )}
                {trick.notes && (
                  <div className="flex gap-2">
                    <StickyNoteIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <p className="text-muted-foreground text-sm">
                      {trick.notes}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
