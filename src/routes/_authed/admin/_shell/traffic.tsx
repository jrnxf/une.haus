import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  AlertTriangleIcon,
  CpuIcon,
  DatabaseIcon,
  EyeIcon,
  FootprintsIcon,
  ServerIcon,
} from "lucide-react"

import { BarList } from "~/components/insights/bar-list"
import { StatCard } from "~/components/stats/stat-card"
import { NumberList } from "~/components/traffic/number-list"
import { SpeedTable } from "~/components/traffic/speed-table"
import { VisitsChart } from "~/components/traffic/visits-chart"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "~/components/ui/empty"
import { traffic } from "~/lib/traffic"
import { formatCount, formatMs } from "~/lib/traffic/shape"

export const Route = createFileRoute("/_authed/admin/_shell/traffic")({
  loaderDeps: ({ search }) => ({ days: search.days }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(traffic.get.queryOptions(deps))
  },
  component: RouteComponent,
})

const regionNames = new Intl.DisplayNames(["en"], { type: "region" })

// "US" -> "united states". An unknown code stays as it is.
function countryName(code: string) {
  try {
    return (regionNames.of(code) ?? code).toLowerCase()
  } catch {
    return code.toLowerCase()
  }
}

function RouteComponent() {
  const { days } = Route.useSearch()
  const { data } = useSuspenseQuery(traffic.get.queryOptions({ days }))

  if (data.status !== "ok") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>
            {data.status === "off" ? "traffic is off" : "no answer"}
          </EmptyTitle>
          <EmptyDescription>
            {data.status === "off"
              ? "set CLOUDFLARE_ANALYTICS_API_TOKEN to show cloudflare numbers here"
              : `cloudflare did not answer: ${data.message.toLowerCase()}`}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const { totals } = data

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 p-4 md:p-6">
      {data.days < days && (
        <p className="text-muted-foreground text-sm">
          cloudflare answers for {data.days} days at most. this page shows the
          last {data.days} days.
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="visits"
          value={formatCount(totals.visits)}
          icon={FootprintsIcon}
          description="pages opened from outside the site, by guests and members"
        />
        <StatCard
          label="page views"
          value={formatCount(totals.pageViews)}
          icon={EyeIcon}
          description="every page load that cloudflare saw. it is a sample, and ad blockers hide some"
        />
        <StatCard
          label="requests"
          value={formatCount(totals.requests)}
          icon={ServerIcon}
          description="requests the worker served: pages, data and images"
        />
        <StatCard
          label="errors"
          value={`${totals.errorRate}%`}
          icon={AlertTriangleIcon}
          description="the share of worker requests that failed"
        />
        <StatCard
          label="cpu p99"
          value={formatMs(totals.cpuP99Ms)}
          icon={CpuIcon}
          description="the cpu time of the slowest 1 in 100 requests"
        />
        <StatCard
          label="rows read"
          value={formatCount(totals.rowsRead)}
          icon={DatabaseIcon}
          description="rows the database read to answer queries. cloudflare bills by this number"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VisitsChart data={data.daily} />
        </div>
        <BarList
          title="referrers"
          hint="where visits come from. direct is a typed address, a bookmark or an app"
          unit="visits"
          empty="no visits yet"
          labelWidth={128}
          data={data.referrers}
        />
      </div>
      <SpeedTable data={data.speed} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BarList
          title="countries"
          unit="visits"
          empty="no visits yet"
          data={data.countries.map((row) => ({
            ...row,
            label: countryName(row.label),
          }))}
        />
        <BarList
          title="devices"
          unit="visits"
          empty="no visits yet"
          data={data.devices}
        />
        <BarList
          title="browsers"
          unit="visits"
          empty="no visits yet"
          data={data.browsers.map((row) => ({
            ...row,
            label: row.label.toLowerCase(),
          }))}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <NumberList
          title="worker results"
          hint="how each worker request ended. a client that left is not a failure"
          rows={data.results.map((row) => ({
            label: row.status,
            value: row.requests.toLocaleString("en-US"),
          }))}
        />
        <NumberList
          title="worker and database"
          rows={[
            {
              label: "worker cpu time, median",
              value: formatMs(totals.cpuP50Ms),
            },
            { label: "worker cpu time, p99", value: formatMs(totals.cpuP99Ms) },
            { label: "db queries", value: formatCount(totals.dbQueries) },
            { label: "db rows read", value: formatCount(totals.rowsRead) },
            {
              label: "db rows written",
              value: formatCount(totals.rowsWritten),
            },
          ]}
        />
      </div>
    </div>
  )
}
