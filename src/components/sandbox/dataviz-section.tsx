import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from "recharts"

import { BarList } from "~/components/insights/bar-list"
import { Panel, PanelEmpty } from "~/components/insights/panel"
import {
  Body,
  Count,
  Head,
  Row,
  Table,
  Td,
  Th,
} from "~/components/insights/table"
import { SandboxSection } from "~/components/sandbox/sample"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart"
import { seriesColor } from "~/lib/insights/format"

const WEEK = [
  { label: "mon", posts: 12, videos: 4 },
  { label: "tue", posts: 18, videos: 7 },
  { label: "wed", posts: 9, videos: 3 },
  { label: "thu", posts: 22, videos: 11 },
  { label: "fri", posts: 30, videos: 14 },
  { label: "sat", posts: 41, videos: 20 },
  { label: "sun", posts: 26, videos: 9 },
]

const chartConfig = {
  posts: { label: "posts", color: "var(--chart-1)" },
  videos: { label: "videos", color: "var(--chart-2)" },
} satisfies ChartConfig

const TABLE_ROWS = [
  { name: "jane doe", posts: 42, videos: 7, asks: 0 },
  { name: "alex rider", posts: 18, videos: 0, asks: 3 },
  { name: "sam flat", posts: 0, videos: 12, asks: 1 },
]

const BAR_DATA = [
  { label: "street", value: 128 },
  { label: "flatland", value: 96 },
  { label: "trials", value: 54 },
  { label: "freestyle", value: 31 },
  { label: "muni", value: 12 },
]

const SERIES = ["posts", "videos", "asks"] as const

export function DatavizSection() {
  return (
    <SandboxSection id="dataviz" title="data viz">
      <Panel
        title="line chart, line tooltip"
        hint="a panel title with a hint shows it in a tooltip"
      >
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-48 w-full"
        >
          <LineChart data={WEEK} margin={{ top: 10, right: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={10}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Line
              type="monotone"
              dataKey="posts"
              stroke="var(--color-posts)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="videos"
              stroke="var(--color-videos)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </Panel>

      <Panel title="bar chart, dot tooltip" aside={<Legend />}>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-48 w-full"
        >
          <BarChart data={WEEK} margin={{ top: 10, right: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={10}
            />
            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
            <Bar dataKey="posts" fill="var(--color-posts)" radius={4} />
            <Bar dataKey="videos" fill="var(--color-videos)" radius={4} />
          </BarChart>
        </ChartContainer>
      </Panel>

      <BarList
        title="bar list"
        hint="one color per row"
        unit="riders"
        data={BAR_DATA}
        empty="no riders yet"
      />

      <Panel title="table (flush panel)" flush>
        <Table>
          <Head>
            <Th>member</Th>
            {SERIES.map((series, index) => (
              <Th key={series} numeric dot={seriesColor(index).dot}>
                {series}
              </Th>
            ))}
          </Head>
          <Body>
            {TABLE_ROWS.map((row) => (
              <Row key={row.name}>
                <Td>{row.name}</Td>
                {SERIES.map((series, index) => (
                  <Td key={series} numeric>
                    <Count value={row[series]} text={seriesColor(index).text} />
                  </Td>
                ))}
              </Row>
            ))}
            <Row>
              <Td muted>muted cell</Td>
              <Td numeric muted>
                -
              </Td>
              <Td numeric muted>
                -
              </Td>
              <Td numeric muted>
                -
              </Td>
            </Row>
          </Body>
        </Table>
      </Panel>

      <Panel title="empty panel">
        <PanelEmpty>no data in this range</PanelEmpty>
      </Panel>

      <BarList
        title="empty bar list"
        unit="riders"
        data={[]}
        empty="no riders yet"
      />
    </SandboxSection>
  )
}

function Legend() {
  return (
    <div className="text-muted-foreground flex items-center gap-3 text-xs">
      <span className="flex items-center gap-1">
        <span className="bg-chart-1 size-2 rounded-full" />
        posts
      </span>
      <span className="flex items-center gap-1">
        <span className="bg-chart-2 size-2 rounded-full" />
        videos
      </span>
    </div>
  )
}
