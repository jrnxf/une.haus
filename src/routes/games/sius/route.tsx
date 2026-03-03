import { useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "@tanstack/react-router"
import { ChevronDown } from "lucide-react"

import { PageHeader } from "~/components/page-header"
import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { games } from "~/lib/games"

export const Route = createFileRoute("/games/sius")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      games.sius.rounds.active.queryOptions(),
    )
  },
})

const sections = [
  { value: "active", route: "/games/sius" },
  { value: "archived", route: "/games/sius/archived" },
] as const

const fmt = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const formatRoundDates = (
  createdAt: Date | string,
  endedAt: Date | string | null,
) => {
  const start = fmt(createdAt)
  const end = endedAt ? fmt(endedAt) : "present"
  return `${start} – ${end}`
}

function RouteComponent() {
  const { data: rounds } = useSuspenseQuery(
    games.sius.rounds.active.queryOptions(),
  )
  const navigate = useNavigate()
  const pathname = useLocation({ select: (l) => l.pathname })
  const params = useParams({ strict: false }) as { roundId?: number }
  const selectedRoundId = params.roundId
  const isArchived = pathname.startsWith("/games/sius/archived")
  const isActive = !isArchived && selectedRoundId !== undefined
  const currentSection = isArchived ? "archived" : "active"
  const selectedGameIndex = rounds.findIndex(
    (c) => c.id === Number(selectedRoundId),
  )

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <PageHeader.Crumb>stack it up</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Right>
          <PageHeader.Actions>
            <Select
              value={currentSection}
              onValueChange={(value) => {
                const section = sections.find((s) => s.value === value)
                if (section) navigate({ to: section.route })
              }}
            >
              <SelectTrigger size="sm" className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isActive && rounds.length > 1 && selectedRoundId !== undefined && (
              <Select
                value={String(selectedRoundId)}
                onValueChange={(v) =>
                  navigate({
                    to: "/games/sius/$roundId",
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
            {isArchived && selectedRoundId !== undefined && (
              <ArchivedRoundSelector
                selectedRoundId={Number(selectedRoundId)}
              />
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

function ArchivedRoundSelector({
  selectedRoundId,
}: {
  selectedRoundId: number
}) {
  const { data: archivedRounds } = useSuspenseQuery(
    games.sius.rounds.archived.list.queryOptions(),
  )

  if (archivedRounds.length <= 1) return null

  const selected = archivedRounds.find((s) => s.id === selectedRoundId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs">
          <span>round {selected?.id ?? selectedRoundId}</span>
          <ChevronDown className="text-muted-foreground size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[300px] overflow-y-auto"
      >
        {[...archivedRounds]
          .toSorted((a, b) => {
            const aEnd = a.endedAt ? new Date(a.endedAt).getTime() : Date.now()
            const bEnd = b.endedAt ? new Date(b.endedAt).getTime() : Date.now()
            return bEnd - aEnd
          })
          .map((s) => (
            <DropdownMenuItem key={s.id} asChild>
              <Link
                to="/games/sius/archived/$roundId"
                params={{ roundId: String(s.id) }}
                className="flex flex-col items-start"
              >
                <span className="leading-tight font-medium lowercase">
                  round {s.id}
                </span>
                <span className="text-muted-foreground text-xs leading-tight lowercase">
                  {formatRoundDates(s.createdAt, s.endedAt)}
                </span>
              </Link>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
