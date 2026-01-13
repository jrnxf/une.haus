import { RadialBar, RadialBarChart } from "recharts";

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

type DisciplineChartProps = {
  data: { discipline: string; count: number }[];
};

const chartConfig = {
  count: { label: "Users" },
  street: { label: "Street", color: "var(--chart-1)" },
  flatland: { label: "Flatland", color: "var(--chart-2)" },
  trials: { label: "Trials", color: "var(--chart-3)" },
  freestyle: { label: "Freestyle", color: "var(--chart-4)" },
  mountain: { label: "Mountain", color: "var(--chart-5)" },
  distance: { label: "Distance", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function DisciplineChart({ data }: DisciplineChartProps) {
  // Transform data for radial bar chart - use discipline name as key for colors
  const chartData = data.map((item) => ({
    discipline: item.discipline,
    count: item.count,
    fill: `var(--color-${item.discipline.toLowerCase()})`,
  }));

  return (
    <Card className="flex h-full flex-col border-dashed py-4">
      <CardHeader className="pb-2">
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
      <CardContent className="flex flex-1 flex-col justify-center px-4">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[200px]"
        >
          <RadialBarChart data={chartData} innerRadius={30} outerRadius={100}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="discipline" />}
            />
            <RadialBar dataKey="count" background />
          </RadialBarChart>
        </ChartContainer>
        <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1">
          {chartData.slice(0, 6).map((item) => {
            const key =
              item.discipline.toLowerCase() as keyof typeof chartConfig;
            const config = chartConfig[key];
            const color =
              config && "color" in config ? config.color : undefined;
            return (
              <Tooltip key={item.discipline}>
                <TooltipTrigger asChild>
                  <div className="flex cursor-help items-center gap-1.5">
                    <div
                      className="size-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-muted-foreground text-xs">
                      {item.discipline}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {item.count} {item.count === 1 ? "user" : "users"}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
