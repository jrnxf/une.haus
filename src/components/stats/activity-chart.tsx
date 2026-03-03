import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

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

type ActivityChartProps = {
  data: { month: string; activityCount: number }[]
}

const chartConfig = {
  activityCount: {
    label: "activity",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function ActivityChart({ data }: ActivityChartProps) {
  const formattedData = data.slice(-12).map((item) => {
    const [year, month] = item.month.split("-")
    const date = new Date(Number(year), Number(month) - 1)
    return {
      ...item,
      label: date.toLocaleDateString("en-US", { month: "short" }).toLowerCase(),
    }
  })

  return (
    <Card className="flex h-full flex-col py-4">
      <CardHeader>
        <Tooltip>
          <TooltipTrigger asChild>
            <CardTitle className="cursor-help text-sm font-medium">
              activity
            </CardTitle>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px] text-xs">
            monthly count of posts, chat messages, game sets, and submissions
          </TooltipContent>
        </Tooltip>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <AreaChart
            data={formattedData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillActivity" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-activityCount)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-activityCount)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={10}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={10}
              width={40}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Area
              type="monotone"
              dataKey="activityCount"
              stroke="var(--color-activityCount)"
              fill="url(#fillActivity)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
