import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { Panel } from "~/components/insights/panel"
import { traffic } from "~/lib/traffic"
import { formatCount } from "~/lib/traffic/shape"

/**
 * Four Cloudflare numbers on the admin overview, with a link to the traffic
 * page. It loads after the page, so a slow Cloudflare answer never holds the
 * overview back. It shows nothing when traffic is off or fails.
 */
export function TrafficStrip({ days }: { days: number }) {
  const { data } = useQuery(traffic.get.queryOptions({ days }))
  if (data?.status !== "ok") return null

  const { totals } = data
  const stats = [
    { label: "visits", value: formatCount(totals.visits) },
    { label: "top referrer", value: totals.topReferrer ?? "none" },
    { label: "slow pages", value: String(totals.slowPages) },
    { label: "server errors", value: `${totals.errorRate}%` },
  ]

  return (
    <Panel
      title="traffic"
      hint="numbers from cloudflare, for guests and members"
      aside={
        <Link
          to="/admin/traffic"
          search={true}
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
        >
          open traffic
        </Link>
      }
    >
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <dt className="text-muted-foreground text-xs">{stat.label}</dt>
            <dd className="truncate text-lg font-semibold tabular-nums">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}
