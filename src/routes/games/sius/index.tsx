import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { LayersIcon } from "lucide-react"

import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { games } from "~/lib/games"
import { useIsAdmin } from "~/lib/session/hooks"

export const Route = createFileRoute("/games/sius/")({
  loader: async ({ context }) => {
    const rounds = await context.queryClient.ensureQueryData(
      games.sius.rounds.active.queryOptions(),
    )

    if (rounds.length > 0) {
      throw redirect({
        to: "/games/sius/$roundId",
        params: { roundId: rounds[0].id },
        replace: true,
      })
    }
  },
  component: NoActiveRound,
})

function NoActiveRound() {
  const isAdmin = useIsAdmin()

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-6 py-10 text-center">
          <div className="bg-muted flex size-16 items-center justify-center rounded-full">
            <LayersIcon className="text-muted-foreground size-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">no active round</h2>
            <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
              there&apos;s no active round right now. check back soon for a new
              challenge!
            </p>
          </div>

          <div className="bg-muted/70 w-full rounded-lg p-4">
            <h3 className="mb-2 text-sm font-medium">how it works</h3>
            <ol className="text-muted-foreground space-y-1 text-left text-sm">
              <li>1. an admin starts a round with the first trick</li>
              <li>2. someone lands that trick and adds a new one</li>
              <li>3. next person lands both tricks and adds another</li>
              <li>
                4. line grows - each person must land all previous tricks!
              </li>
            </ol>
          </div>

          {isAdmin && (
            <Button asChild>
              <Link to="/admin/games">start</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
