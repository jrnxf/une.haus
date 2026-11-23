import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Panel } from "~/components/insights/panel"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart"
import { formatDay } from "~/lib/insights/format"

const chartConfig = {
  visits: { label: "visits", color: "var(--chart-1)" },
} satisfies ChartConfig

export function VisitsChart({
  data,
}: {
  data: { day: string; visits: number }[]
}) {
  const rows = data.map((row) => ({ ...row, label: formatDay(row.day) }))

  return (
    <Panel
      title="visits per day"
      hint="a visit is a page that a guest or a member opens from outside the site. days are in utc"
    >
      <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
        <BarChart
          data={rows}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={10}
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={10}
            width={32}
            allowDecimals={false}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Bar
            dataKey="visits"
            fill="var(--color-visits)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </Panel>
  )
}
