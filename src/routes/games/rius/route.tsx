import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router"

import { PageHeader } from "~/components/page-header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"

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
  const currentSection =
    sections.find((s) => pathname.startsWith(s.route))?.value ??
    sections[0].value

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
          </PageHeader.Actions>
        </PageHeader.Right>
      </PageHeader>

      <div className="mx-auto w-full max-w-2xl p-4">
        <Outlet />
      </div>
    </>
  )
}
