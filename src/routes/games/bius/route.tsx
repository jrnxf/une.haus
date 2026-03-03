import { useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Outlet,
  useNavigate,
  useParams,
} from "@tanstack/react-router"

import { PageHeader } from "~/components/page-header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { games } from "~/lib/games"

export const Route = createFileRoute("/games/bius")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(games.bius.rounds.queryOptions())
  },
})

function RouteComponent() {
  const { data: rounds } = useSuspenseQuery(games.bius.rounds.queryOptions())
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { roundId?: number }
  const selectedRoundId = params.roundId
  const selectedGameIndex = rounds.findIndex(
    (c) => c.id === Number(selectedRoundId),
  )

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <PageHeader.Crumb>back it up</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Right>
          <PageHeader.Actions>
            {rounds.length > 1 && selectedRoundId !== undefined && (
              <Select
                value={String(selectedRoundId)}
                onValueChange={(v) =>
                  navigate({
                    to: "/games/bius/$roundId",
                    params: { roundId: Number(v) },
                    replace: true,
                  })
                }
              >
                <SelectTrigger size="sm" className="text-xs">
                  <SelectValue>game {selectedGameIndex + 1}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {rounds.map((c, i) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      game {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </PageHeader.Actions>
        </PageHeader.Right>
      </PageHeader>
      <div className="mx-auto w-full max-w-5xl p-4">
        <Outlet />
      </div>
    </>
  )
}
