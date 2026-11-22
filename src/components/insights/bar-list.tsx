import { Bar, BarChart, XAxis, YAxis } from "recharts"

import { Panel, PanelEmpty } from "~/components/insights/panel"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart"
import { seriesColor } from "~/lib/insights/format"

// Horizontal bars, one color per row, in the style of the /metrics
// disciplines chart.
export function BarList({
  title,
  hint,
  unit,
  data,
  empty,
}: {
  title: string
  hint?: string
  unit: string
  data: { label: string; value: number }[]
  empty: string
}) {
  const chartConfig = { value: { label: unit } } satisfies ChartConfig
  const rows = data.map((row, index) => ({
    ...row,
    fill: seriesColor(index).fill,
  }))

  return (
    <Panel title={title} hint={hint}>
      {rows.length === 0 ? (
        <PanelEmpty>{empty}</PanelEmpty>
      ) : (
        <ChartContainer
          config={chartConfig}
          className="aspect-auto w-full"
          // One 28px band per row, so short lists do not stretch.
          // oxlint-disable-next-line shadcn/no-inline-styles -- the height follows the row count
          style={{ height: rows.length * 28 + 8 }}
        >
          <BarChart
            accessibilityLayer
            data={rows}
            layout="vertical"
            margin={{ left: 0, right: 8 }}
          >
            <YAxis
              dataKey="label"
              type="category"
              tickLine={false}
              tickMargin={8}
              axisLine={false}
              width={96}
              fontSize={11}
            />
            <XAxis dataKey="value" type="number" hide domain={[0, "dataMax"]} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="value" layout="vertical" radius={4} />
          </BarChart>
        </ChartContainer>
      )}
    </Panel>
  )
}
