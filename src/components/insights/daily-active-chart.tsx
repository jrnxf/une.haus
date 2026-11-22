import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Panel } from "~/components/insights/panel"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart"
import { formatDay } from "~/lib/insights/format"

const chartConfig = {
  members: { label: "active members", color: "var(--chart-1)" },
  askers: { label: "askers", color: "var(--chart-2)" },
} satisfies ChartConfig

export function DailyActiveChart({
  data,
}: {
  data: { day: string; members: number; askers: number }[]
}) {
  const rows = data.map((row) => ({ ...row, label: formatDay(row.day) }))

  return (
    <Panel
      title="daily active"
      hint="members who used une.haus each day, and members who asked a question"
      aside={<Legend />}
    >
      <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
        <AreaChart
          data={rows}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            {(["members", "askers"] as const).map((key) => (
              <linearGradient
                key={key}
                id={`fill-insights-${key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={`var(--color-${key})`}
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor={`var(--color-${key})`}
                  stopOpacity={0.05}
                />
              </linearGradient>
            ))}
          </defs>
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
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="line" />}
          />
          <Area
            type="monotone"
            dataKey="members"
            stroke="var(--color-members)"
            fill="url(#fill-insights-members)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="askers"
            stroke="var(--color-askers)"
            fill="url(#fill-insights-askers)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </Panel>
  )
}

function Legend() {
  return (
    <div className="text-muted-foreground flex items-center gap-3 text-xs">
      <span className="flex items-center gap-1">
        <span className="bg-chart-1 size-2 rounded-full" />
        members
      </span>
      <span className="flex items-center gap-1">
        <span className="bg-chart-2 size-2 rounded-full" />
        askers
      </span>
    </div>
  )
}
