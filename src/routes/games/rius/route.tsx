import { useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router"
import pluralize from "pluralize"

import { PageHeader } from "~/components/page-header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { games } from "~/lib/games"

export const Route = createFileRoute("/games/rius")({
  component: RouteComponent,
})

const sections = [
  { value: "active", route: "/games/rius/active" },
  { value: "upcoming", route: "/games/rius/upcoming" },
  { value: "archived", route: "/games/rius/archived" },
] as const

function RouteComponent() {
  const navigate = useNavigate()
  const pathname = useLocation({ select: (l) => l.pathname })
  const { data: archivedRius } = useSuspenseQuery(
    games.rius.archived.list.queryOptions(),
  )
  const currentSection =
    sections.find((s) => pathname.startsWith(s.route))?.value ??
    sections[0].value
  const selectedArchivedRoundId =
    pathname.match(/^\/games\/rius\/archived\/(\d+)$/)?.[1] ??
    archivedRius[0]?.id.toString() ??
    null

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <PageHeader.Crumb>rack it up</PageHeader.Crumb>
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

            {currentSection === "archived" && archivedRius.length > 0 && (
              <Select
                value={selectedArchivedRoundId}
                onValueChange={(value) => {
                  if (!value) return
                  navigate({
                    to: "/games/rius/archived/$riuId",
                    params: { riuId: value },
                  })
                }}
              >
                <SelectTrigger size="sm" className="w-full text-xs sm:w-auto">
                  <SelectValue>
                    {selectedArchivedRoundId
                      ? `round ${selectedArchivedRoundId}`
                      : "round"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="end" className="w-fit min-w-max">
                  {[...archivedRius]
                    .toSorted((a, b) => b.id - a.id)
                    .map((riu) => (
                      <SelectItem key={riu.id} value={riu.id.toString()}>
                        <div className="flex w-full flex-col items-start">
                          <span className="text-sm leading-tight font-medium lowercase">
                            round {riu.id}
                          </span>
                          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs leading-tight whitespace-nowrap lowercase">
                            {formatRiuDate(riu.createdAt)}
                            <span className="opacity-25">/</span>
                            {riu.setsCount} {pluralize("set", riu.setsCount)}
                            <span className="opacity-25">/</span>
                            {riu.submissionsCount}{" "}
                            {pluralize("submission", riu.submissionsCount)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </PageHeader.Actions>
        </PageHeader.Right>
      </PageHeader>

      <div className="mx-auto w-full max-w-2xl p-4">
        <Outlet />
      </div>
    </>
  )
}

const formatRiuDate = (createdAt: Date | string) => {
  const date = typeof createdAt === "string" ? new Date(createdAt) : createdAt
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
