import { Bar, BarChart, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"

type DisciplineChartProps = {
  data: { discipline: string; count: number }[]
}

const DISCIPLINE_COLORS: Record<string, string> = {
  street: "var(--chart-1)",
  flatland: "var(--chart-2)",
  trials: "var(--chart-3)",
  freestyle: "var(--chart-4)",
  mountain: "var(--chart-5)",
  distance: "var(--chart-1)",
}

export function DisciplineChart({ data }: DisciplineChartProps) {
  const chartConfig = Object.fromEntries([
    ["count", { label: "users" }],
    ...data.map((item) => [
      item.discipline.toLowerCase(),
      {
        label: item.discipline,
        color:
          DISCIPLINE_COLORS[item.discipline.toLowerCase()] ?? "var(--chart-1)",
      },
    ]),
  ]) satisfies ChartConfig

  const chartData = data.map((item) => ({
    discipline: item.discipline.toLowerCase(),
    count: item.count,
    fill: `var(--color-${item.discipline.toLowerCase()})`,
  }))

  return (
    <Card className="flex h-full flex-col py-4">
      <CardHeader>
        <Tooltip>
          <TooltipTrigger asChild>
            <CardTitle className="cursor-help text-sm font-medium">
              disciplines
            </CardTitle>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px] text-xs">
            riding styles selected by users in their profiles
          </TooltipContent>
        </Tooltip>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col justify-center">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: 0 }}
          >
            <YAxis
              dataKey="discipline"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              width={80}
              tickFormatter={(value: string) =>
                chartConfig[value as keyof typeof chartConfig]?.label ?? value
              }
            />
            <XAxis dataKey="count" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="count" layout="vertical" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
