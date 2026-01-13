import type { Trick, TricksData } from "~/lib/tricks";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";

import { VideoEmbed } from "./video-embed";

type TrickDetailProps = {
  trick: Trick;
  tricksData: TricksData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToTrick: (trickId: string) => void;
};

function TrickLink({
  trickId,
  tricksData,
  onNavigate,
}: {
  trickId: string;
  tricksData: TricksData;
  onNavigate: (trickId: string) => void;
}) {
  const trick = tricksData.byId[trickId];
  if (!trick) {
    return <span className="text-muted-foreground">{trickId}</span>;
  }

  return (
    <Button
      className="h-auto px-2 py-1 text-sm"
      onClick={() => onNavigate(trickId)}
      variant="outline"
    >
      {trick.name}
    </Button>
  );
}

export function TrickDetail({
  trick,
  tricksData,
  open,
  onOpenChange,
  onNavigateToTrick,
}: TrickDetailProps) {
  const prerequisiteTrick = trick.prerequisite
    ? tricksData.byId[trick.prerequisite]
    : null;
  const optionalPrerequisiteTrick = trick.optionalPrerequisite
    ? tricksData.byId[trick.optionalPrerequisite]
    : null;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="space-y-6 p-6">
            <DialogHeader>
              <DialogTitle className="pr-8 text-xl">{trick.name}</DialogTitle>
              {trick.alternateNames.length > 0 && (
                <DialogDescription>
                  Also known as: {trick.alternateNames.join(", ")}
                </DialogDescription>
              )}
            </DialogHeader>

            {/* Video */}
            {trick.videoUrl && (
              <div className="overflow-hidden rounded-lg">
                <VideoEmbed
                  timestamp={trick.videoTimestamp}
                  title={trick.name}
                  url={trick.videoUrl}
                />
              </div>
            )}

            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              {trick.categories.map((cat) => (
                <Badge key={cat} variant="secondary">
                  {cat}
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
                    <TrickLink
                      onNavigate={onNavigateToTrick}
                      trickId={prerequisiteTrick.id}
                      tricksData={tricksData}
                    />
                  )}
                  {optionalPrerequisiteTrick && (
                    <TrickLink
                      onNavigate={onNavigateToTrick}
                      trickId={optionalPrerequisiteTrick.id}
                      tricksData={tricksData}
                    />
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
                  {trick.dependents.slice(0, 8).map((depId) => (
                    <TrickLink
                      key={depId}
                      onNavigate={onNavigateToTrick}
                      trickId={depId}
                      tricksData={tricksData}
                    />
                  ))}
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
                <h3 className="text-muted-foreground text-sm font-medium">
                  Notes
                </h3>
                <p className="text-muted-foreground text-sm">{trick.notes}</p>
              </div>
            )}

            {/* Depth indicator */}
            <div className="border-t pt-4">
              <p className="text-muted-foreground text-xs">
                Skill depth: {trick.depth} (
                {trick.depth === 0
                  ? "foundational"
                  : `${trick.depth} step${trick.depth > 1 ? "s" : ""} from a foundational trick`}
                )
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
