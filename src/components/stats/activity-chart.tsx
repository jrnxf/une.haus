import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

type ActivityChartProps = {
  data: { month: string; activityCount: number }[];
};

const chartConfig = {
  activityCount: {
    label: "Activity",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ActivityChart({ data }: ActivityChartProps) {
  // Format month labels for display (e.g., "2024-01" -> "Jan 24")
  const formattedData = data.map((item) => {
    const [year, month] = item.month.split("-");
    const date = new Date(Number(year), Number(month) - 1);
    return {
      ...item,
      label: date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
    };
  });

  return (
    <Card className="flex h-full flex-col border-dashed py-4">
      <CardHeader className="pb-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <CardTitle className="cursor-help text-sm font-medium">
              activity over time
            </CardTitle>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px] text-xs">
            monthly count of posts, chat messages, game sets, and submissions
          </TooltipContent>
        </Tooltip>
      </CardHeader>
      <CardContent className="flex-1 px-4">
        <ChartContainer config={chartConfig} className="h-full min-h-[200px] w-full">
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
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={10}
              width={30}
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
  );
}
