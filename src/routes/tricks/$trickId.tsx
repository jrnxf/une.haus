import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Video } from "lucide-react";

import { VideoCarousel } from "~/components/tricks/video-carousel";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-lg">Trick not found</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/tricks">Back to Tricks</Link>
          </Button>
        </div>
      </div>
    );
  }

  const prerequisiteTrick = trick.prerequisite
    ? data.byId[trick.prerequisite]
    : null;
  const optionalPrerequisiteTrick = trick.optionalPrerequisite
    ? data.byId[trick.optionalPrerequisite]
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Back navigation */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/tricks" search={{ trick: trickId }}>
            <ArrowLeft className="size-4" />
            Back to graph
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">{trick.name}</h1>
          {trick.alternateNames.length > 0 && (
            <p className="text-muted-foreground mt-1">
              Also known as: {trick.alternateNames.join(", ")}
            </p>
          )}
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
              Definition
            </h3>
            <p className="text-sm">{trick.definition}</p>
          </div>
        )}

        {/* Prerequisites */}
        {(prerequisiteTrick || optionalPrerequisiteTrick) && (
          <div className="space-y-2">
            <h3 className="text-muted-foreground text-sm font-medium">
              Prerequisites
            </h3>
            <div className="flex flex-wrap gap-2">
              {prerequisiteTrick && (
                <Button
                  className="h-auto px-2 py-1 text-sm"
                  variant="outline"
                  asChild
                >
                  <Link to="/tricks/$trickId" params={{ trickId: prerequisiteTrick.id }}>
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
                  <Link to="/tricks/$trickId" params={{ trickId: optionalPrerequisiteTrick.id }}>
                    {optionalPrerequisiteTrick.name}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Leads to / Dependents */}
        {trick.dependents.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-muted-foreground text-sm font-medium">
              Leads to
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
              History
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
            <h3 className="text-muted-foreground text-sm font-medium">Notes</h3>
            <p className="text-muted-foreground text-sm">{trick.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end border-t pt-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link
                to="/tricks/$trickId/submit-video"
                params={{ trickId: trick.id }}
              >
                <Video className="size-3" />
                Submit Video
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/tricks/$trickId/suggest" params={{ trickId: trick.id }}>
                <Pencil className="size-3" />
                Suggest Edit
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
