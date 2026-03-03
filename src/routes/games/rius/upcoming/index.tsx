import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { GhostIcon } from "lucide-react"
import pluralize from "pluralize"

import { DeleteSetButton } from "~/components/delete-set-button"
import { RichText } from "~/components/rich-text"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { UserChip } from "~/components/user-chip"
import { VideoPlayer } from "~/components/video-player"
import { games } from "~/lib/games"
import { useSessionUser } from "~/lib/session/hooks"

export const Route = createFileRoute("/games/rius/upcoming/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      games.rius.upcoming.roster.queryOptions(),
    )
  },
})

function RouteComponent() {
  const { data } = useSuspenseQuery(games.rius.upcoming.roster.queryOptions())
  const user = useSessionUser()

  const playerRoster = Object.values(data.roster)
  const isUserInGame = user && data.roster[user.id]
  const hasUserSets = data.authUserSets && data.authUserSets.length > 0
  const userSetsCount = data.authUserSets?.length ?? 0
  const canUploadMore = userSetsCount < 3

  return (
    <div className="space-y-6">
      {/* My Sets Section - Show first if user has sets */}
      {hasUserSets && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">your sets</h2>
              <p className="text-muted-foreground text-sm">
                {userSetsCount} of 3 uploaded
              </p>
            </div>
            {canUploadMore && (
              <Button size="sm" variant="outline" className="gap-1.5" asChild>
                <Link to="/games/rius/upcoming/join">add set</Link>
              </Button>
            )}
          </div>

          <div className="grid gap-4">
            {data.authUserSets?.map((set) => (
              <Card key={set.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">
                        {set.name}
                      </CardTitle>
                      {set.instructions && (
                        <div className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                          <RichText content={set.instructions} />
                        </div>
                      )}
                    </div>
                    <DeleteSetButton setId={set.id} />
                  </div>
                </CardHeader>
                {set.video.playbackId && (
                  <CardContent className="pt-0">
                    <VideoPlayer playbackId={set.video.playbackId} />
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Roster Section */}
      <section className="space-y-4">
        {playerRoster.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <GhostIcon />
              </EmptyMedia>
              <EmptyTitle>no players yet</EmptyTitle>
              <EmptyDescription>
                be the first to join the next round!
              </EmptyDescription>
            </EmptyHeader>
            {(!user || !isUserInGame) && (
              <EmptyContent>
                <Button asChild>
                  <Link to="/games/rius/upcoming/join">join</Link>
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">roster</h2>
                <p className="text-muted-foreground text-sm">
                  {playerRoster.length}{" "}
                  {pluralize("rider", playerRoster.length)} joined
                </p>
              </div>
              {(!user || !isUserInGame) && (
                <Button asChild>
                  <Link to="/games/rius/upcoming/join">join</Link>
                </Button>
              )}
            </div>

            {playerRoster.map((player) => (
              <UserChip
                key={player.id}
                user={{
                  id: player.id,
                  name: player.name,
                  avatarId: player.avatarId,
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
