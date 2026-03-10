import { Link } from "@tanstack/react-router"
import { ShieldIcon } from "lucide-react"

import { RichText } from "~/components/rich-text"
import { VideoCarousel } from "~/components/tricks/video-carousel"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { ScrollArea } from "~/components/ui/scroll-area"
import { type Trick, type TricksData } from "~/lib/tricks"

type TrickDetailProps = {
  trick: Trick
  tricksData: TricksData
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigateToTrick: (trickId: string) => void
  isAdmin?: boolean
}

function TrickLink({
  trickId,
  tricksData,
  onNavigate,
}: {
  trickId: string
  tricksData: TricksData
  onNavigate: (trickId: string) => void
}) {
  const trick = tricksData.byId[trickId]
  if (!trick) {
    return <span className="text-muted-foreground">{trickId}</span>
  }

  return (
    <Button
      className="h-auto px-2 py-1 text-sm"
      onClick={() => onNavigate(trickId)}
      variant="outline"
    >
      {trick.name}
    </Button>
  )
}

export function TrickDetail({
  trick,
  tricksData,
  open,
  onOpenChange,
  onNavigateToTrick,
  isAdmin,
}: TrickDetailProps) {
  const prerequisiteTrick = trick.prerequisite
    ? tricksData.byId[trick.prerequisite]
    : null
  const optionalPrerequisiteTrick = trick.optionalPrerequisite
    ? tricksData.byId[trick.optionalPrerequisite]
    : null

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="space-y-6 p-6">
            <DialogHeader>
              <DialogTitle className="pr-8 text-xl">{trick.name}</DialogTitle>
              {trick.alternateNames.length > 0 && (
                <DialogDescription>
                  also known as: {trick.alternateNames.join(", ")}
                </DialogDescription>
              )}
            </DialogHeader>

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

            {/* Description */}
            {trick.description && (
              <div className="space-y-1">
                <h3 className="text-muted-foreground text-sm font-medium">
                  description
                </h3>
                <RichText content={trick.description} className="text-sm" />
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
                  leads to
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

            {/* Nearby (computed neighbors) */}
            {trick.neighbors.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-muted-foreground text-sm font-medium">
                  nearby
                </h3>
                <div className="flex flex-wrap gap-2">
                  {trick.neighbors.slice(0, 8).map((neighbor) => (
                    <TrickLink
                      key={neighbor.id}
                      onNavigate={onNavigateToTrick}
                      trickId={neighbor.id}
                      tricksData={tricksData}
                    />
                  ))}
                  {trick.neighbors.length > 8 && (
                    <span className="text-muted-foreground self-center text-sm">
                      +{trick.neighbors.length - 8} more
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
                    <span>first landed by {trick.inventedBy}</span>
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
                  notes
                </h3>
                <RichText
                  content={trick.notes}
                  className="text-muted-foreground text-sm"
                />
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
                    submit
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link
                    to="/tricks/$trickId/suggest"
                    params={{ trickId: trick.id }}
                  >
                    edit
                  </Link>
                </Button>
                {isAdmin && (
                  <Button
                    variant="secondary"
                    size="icon-xs"
                    asChild
                    aria-label="edit trick as admin"
                  >
                    <Link
                      to="/admin/tricks/$trickId/edit"
                      params={{ trickId: trick.id }}
                    >
                      <ShieldIcon className="size-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
