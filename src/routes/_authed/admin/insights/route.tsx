import { createFileRoute, Outlet } from "@tanstack/react-router"
import { ActivityIcon, SparklesIcon, UsersIcon } from "lucide-react"

import { RangeSelect } from "~/components/insights/range-select"
import { PageHeader } from "~/components/page-header"
import { insights } from "~/lib/insights"

export const Route = createFileRoute("/_authed/admin/insights")({
  validateSearch: insights.schema,
  component: RouteComponent,
})

const TABS = [
  { to: "/admin/insights", label: "overview", icon: ActivityIcon, exact: true },
  { to: "/admin/insights/ask", label: "ask", icon: SparklesIcon, exact: false },
  {
    to: "/admin/insights/members",
    label: "members",
    icon: UsersIcon,
    exact: false,
  },
] as const

function RouteComponent() {
  const { days } = Route.useSearch()
  const navigate = Route.useNavigate()
  const setDays = (next: number) =>
    navigate({ search: (prev) => ({ ...prev, days: next }), replace: true })

  const tabs = (
    <PageHeader.Tabs>
      {TABS.map((tab) => (
        <PageHeader.Tab
          key={tab.to}
          to={tab.to}
          icon={tab.icon}
          exact={tab.exact}
          keepSearch
        >
          {tab.label}
        </PageHeader.Tab>
      ))}
    </PageHeader.Tabs>
  )

  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/admin">admin</PageHeader.Crumb>
          <PageHeader.Crumb>insights</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Right>
          {tabs}
          <RangeSelect days={days} onChange={setDays} />
        </PageHeader.Right>
      </PageHeader>
      <div className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
        {/* The page header is hidden on small screens, so the tabs and
            the range move into the page there. */}
        <div className="flex items-center justify-between gap-2 md:hidden">
          {tabs}
          <RangeSelect days={days} onChange={setDays} />
        </div>
        <Outlet />
      </div>
    </>
  )
}
