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
  ask: { label: "from /ask", color: "var(--chart-1)" },
  home: { label: "from home", color: "var(--chart-2)" },
} satisfies ChartConfig

export function AskPerDayChart({
  data,
}: {
  data: { day: string; ask: number; home: number }[]
}) {
  const rows = data.map((row) => ({ ...row, label: formatDay(row.day) }))

  return (
    <Panel
      title="questions per day"
      hint="questions asked on the /ask page and from the home page ask box"
      aside={
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="bg-chart-1 size-2 rounded-full" />
            /ask
          </span>
          <span className="flex items-center gap-1">
            <span className="bg-chart-2 size-2 rounded-full" />
            home
          </span>
        </div>
      }
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
          <Bar dataKey="ask" stackId="source" fill="var(--color-ask)" />
          <Bar
            dataKey="home"
            stackId="source"
            fill="var(--color-home)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </Panel>
  )
}
