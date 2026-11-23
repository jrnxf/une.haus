import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  ActivityIcon,
  DollarSignIcon,
  EyeIcon,
  MessageCircleQuestionIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react"

import { BarList } from "~/components/insights/bar-list"
import { DailyActiveChart } from "~/components/insights/daily-active-chart"
import { FeaturesTable } from "~/components/insights/features-table"
import { MembersTable } from "~/components/insights/members-table"
import { PagesTable } from "~/components/insights/pages-table"
import { StatCard } from "~/components/stats/stat-card"
import { insights } from "~/lib/insights"
import { formatUsd } from "~/lib/insights/format"

export const Route = createFileRoute("/_authed/admin/_shell/")({
  loaderDeps: ({ search }) => ({ days: search.days }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(insights.overview.queryOptions(deps)),
      context.queryClient.ensureQueryData(insights.members.queryOptions(deps)),
    ])
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { days } = Route.useSearch()
  const { data } = useSuspenseQuery(insights.overview.queryOptions({ days }))
  const { data: usage } = useSuspenseQuery(
    insights.members.queryOptions({ days }),
  )
  const { totals } = data

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 p-4 md:p-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="active today"
          value={totals.activeToday}
          icon={ActivityIcon}
          description="members who used une.haus today, in portugal time"
        />
        <StatCard
          label={`active ${days}d`}
          value={totals.activeMembers}
          icon={UsersIcon}
          description={`members who used une.haus in the last ${days} days`}
        />
        <StatCard
          label="page views"
          value={totals.pageViews}
          icon={EyeIcon}
          description="page views from members and guests"
        />
        <StatCard
          label="questions"
          value={totals.questions}
          icon={MessageCircleQuestionIcon}
          description="questions asked to ask"
        />
        <StatCard
          label="ask spend"
          value={formatUsd(totals.spendMicrousd)}
          icon={DollarSignIcon}
          description="model cost of every question"
        />
        <StatCard
          label="new members"
          value={totals.newMembers}
          icon={UserPlusIcon}
          description={`members who joined in the last ${days} days`}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DailyActiveChart data={data.daily} />
        </div>
        <BarList
          title="feature use"
          hint="members who used each feature"
          unit="members"
          empty="no use counted yet"
          data={data.features
            .slice(0, 8)
            .map((row) => ({ label: row.feature, value: row.members }))}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <FeaturesTable data={data.features} days={days} />
        </div>
        <div className="lg:col-span-2">
          <PagesTable data={data.pages} />
        </div>
      </div>
      <MembersTable
        today={usage.today}
        features={usage.features}
        members={usage.members}
      />
    </div>
  )
}
