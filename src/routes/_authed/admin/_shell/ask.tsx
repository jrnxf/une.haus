import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  AlertTriangleIcon,
  DollarSignIcon,
  GaugeIcon,
  MessageCircleQuestionIcon,
  RepeatIcon,
  UsersIcon,
} from "lucide-react"

import { AskPerDayChart } from "~/components/insights/ask-per-day-chart"
import { AskersTable } from "~/components/insights/askers-table"
import { BarList } from "~/components/insights/bar-list"
import { RecentAsksTable } from "~/components/insights/recent-asks-table"
import { StatCard } from "~/components/stats/stat-card"
import { insights } from "~/lib/insights"
import { formatUsd } from "~/lib/insights/format"

export const Route = createFileRoute("/_authed/admin/_shell/ask")({
  loaderDeps: ({ search }) => ({ days: search.days }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(insights.ask.queryOptions(deps))
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { days } = Route.useSearch()
  const { data } = useSuspenseQuery(insights.ask.queryOptions({ days }))
  const { totals } = data

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 p-4 md:p-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="questions"
          value={totals.questions}
          icon={MessageCircleQuestionIcon}
          description={`questions asked in the last ${days} days`}
        />
        <StatCard
          label="askers"
          value={totals.askers}
          icon={UsersIcon}
          description="members who asked at least one question"
        />
        <StatCard
          label="returning"
          value={totals.repeatAskers}
          icon={RepeatIcon}
          description="members who asked on two or more days"
        />
        <StatCard
          label="spend"
          value={formatUsd(totals.spendMicrousd)}
          icon={DollarSignIcon}
          description="model cost of every question"
        />
        <StatCard
          label="per question"
          value={formatUsd(totals.perQuestionMicrousd, 3)}
          icon={GaugeIcon}
          description="average model cost of one question"
        />
        <StatCard
          label="errors"
          value={totals.errors}
          icon={AlertTriangleIcon}
          description={`questions that failed, were refused, too long or stopped. ${totals.limitHits} more hit the daily limit`}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AskPerDayChart data={data.perDay} />
        </div>
        <BarList
          title="tools"
          hint="the data tools ask used to answer, by number of calls"
          unit="calls"
          empty="no tool calls yet"
          data={data.tools.map((row) => ({ label: row.tool, value: row.uses }))}
        />
      </div>
      <AskersTable data={data.askers} />
      <RecentAsksTable data={data.recent} />
    </div>
  )
}
