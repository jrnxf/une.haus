import {
  createFileRoute,
  Outlet,
  stripSearchParams,
  useLocation,
} from "@tanstack/react-router"

import { AdminTabs } from "~/components/admin/admin-tabs"
import { BuildSha } from "~/components/admin/build-sha"
import { RangeSelect } from "~/components/insights/range-select"
import { PageHeader } from "~/components/page-header"
import { insights } from "~/lib/insights"

// The frame of the admin area: the header with the section tabs. It is a
// pathless layout, so the trick admin pages under /admin/tricks keep their
// own header.
export const Route = createFileRoute("/_authed/admin/_shell")({
  validateSearch: insights.schema,
  // Keep the default range out of the address.
  search: { middlewares: [stripSearchParams({ days: 30 })] },
  // Only the site admin (user 1). The server functions check again.
  beforeLoad: ({ context }) => {
    if (context.user.id !== 1) {
      throw new Error("Not authorized")
    }
  },
  component: RouteComponent,
})

// The pages that show numbers over a range of days.
const RANGED = new Set(["/admin", "/admin/traffic", "/admin/ask"])

function RouteComponent() {
  const { days } = Route.useSearch()
  const navigate = Route.useNavigate()
  const pathname = useLocation({
    select: (location) => location.pathname.replace(/(.)\/$/, "$1"),
  })

  const controls = RANGED.has(pathname) && (
    <>
      <RangeSelect
        days={days}
        onChange={(next) =>
          navigate({
            search: (prev) => ({ ...prev, days: next }),
            replace: true,
          })
        }
      />
      <BuildSha />
    </>
  )

  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>admin</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Right>
          <AdminTabs />
          {controls}
        </PageHeader.Right>
      </PageHeader>
      {/* The page header is hidden on small screens, so the tabs and the
          range move into the page there. */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 md:hidden">
        <AdminTabs />
        {controls}
      </div>
      <Outlet />
    </>
  )
}
