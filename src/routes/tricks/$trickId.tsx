import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GhostIcon } from "lucide-react";

import { BackLink } from "~/components/back-link";
import { VideoCarousel } from "~/components/tricks/video-carousel";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { tricks } from "~/lib/tricks";

export const Route = createFileRoute("/tricks/$trickId")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(tricks.graph.queryOptions()),
  component: TrickDetailPage,
});

function TrickDetailPage() {
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
    <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
      {/* Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <BackLink to="/tricks" search={{ trick: trickId }} label="graph" />
        <Button asChild>
          <Link to="/tricks/$trickId/suggest" params={{ trickId: trick.id }}>
            Edit
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold lowercase">{trick.name}</h1>
        </div>

        {/* Videos */}
        {trick.videos.length > 0 && <VideoCarousel videos={trick.videos} />}

        {/* Elements */}
        <div className="flex flex-wrap gap-2">
          {trick.elements.map((elem) => (
            <Badge key={elem} variant="secondary">
              {elem}
            </Badge>
          ))}
        </div>

        {/* Definition */}
        {trick.definition && (
          <div className="space-y-1">
            <h3 className="text-muted-foreground text-sm font-medium">
              definition
            </h3>
            <p className="text-sm">{trick.definition}</p>
          </div>
        )}

        {/* Also known as */}
        {trick.alternateNames.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-muted-foreground text-sm font-medium">
              also known as
            </h3>
            <p className="text-sm">{trick.alternateNames.join(", ")}</p>
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
          </div>
        )}

        {/* Unlocks */}
        {trick.dependents.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-muted-foreground text-sm font-medium">
              unlocks
            </h3>
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
                    <Link to="/tricks/$trickId" params={{ trickId: depId }}>
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
          </div>
        )}

        {/* Inventor / Year */}
        {(trick.inventedBy || trick.yearLanded) && (
          <div className="space-y-1">
            <h3 className="text-muted-foreground text-sm font-medium">
              history
            </h3>
            <p className="text-sm">
              {trick.inventedBy && (
                <span>First landed by {trick.inventedBy}</span>
              )}
              {trick.inventedBy && trick.yearLanded && <span> in </span>}
              {trick.yearLanded && <span>{trick.yearLanded}</span>}
            </p>
          </div>
        )}

        {/* Notes */}
        {trick.notes && (
          <div className="space-y-1">
            <h3 className="text-muted-foreground text-sm font-medium">notes</h3>
            <p className="text-muted-foreground text-sm">{trick.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
