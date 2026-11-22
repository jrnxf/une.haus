import { Link } from "@tanstack/react-router"

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
import { Badge } from "~/components/ui/badge"
import { percentChange, seriesColor } from "~/lib/insights/format"
import { cn } from "~/lib/utils"

type Feature = {
  feature: string
  members: number
  views: number
  actions: number
  prevMembers: number | null
  top: { id: number; name: string } | null
}

export function FeaturesTable({
  data,
  days,
}: {
  data: Feature[]
  days: number
}) {
  return (
    <Panel
      title="features"
      hint="members who opened each part of the site (views) or did something there (actions), against the window before"
      flush
    >
      {data.length === 0 ? (
        <PanelEmpty>no use counted yet</PanelEmpty>
      ) : (
        <Table>
          <Head>
            <Th>feature</Th>
            <Th numeric dot="bg-chart-1">
              members
            </Th>
            <Th numeric dot="bg-chart-2">
              views
            </Th>
            <Th numeric dot="bg-chart-4">
              actions
            </Th>
            <Th numeric>vs prior {days}d</Th>
            <Th>top member</Th>
          </Head>
          <Body>
            {data.map((row, index) => (
              <Row key={row.feature}>
                <Td>
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        seriesColor(index).dot,
                      )}
                    />
                    {row.feature}
                  </span>
                </Td>
                <Td numeric>
                  <Count value={row.members} text="text-chart-1" />
                </Td>
                <Td numeric>
                  <Count value={row.views} text="text-chart-2" />
                </Td>
                <Td numeric>
                  <Count value={row.actions} text="text-chart-4" />
                </Td>
                <Td numeric>
                  <Change current={row.members} previous={row.prevMembers} />
                </Td>
                <Td muted>
                  {row.top ? (
                    <Link
                      to="/users/$userId"
                      params={{ userId: row.top.id }}
                      className="hover:text-foreground block max-w-40 truncate"
                    >
                      {row.top.name}
                    </Link>
                  ) : null}
                </Td>
              </Row>
            ))}
          </Body>
        </Table>
      )}
    </Panel>
  )
}

function Change({
  current,
  previous,
}: {
  current: number
  previous: number | null
}) {
  const change = percentChange(current, previous)
  if (change === null) {
    return <Badge variant="secondary">new</Badge>
  }
  if (change === 0) {
    return <span className="text-muted-foreground">0%</span>
  }
  return (
    <Badge variant={change > 0 ? "success" : "destructive"}>
      {change > 0 ? "+" : ""}
      {change}%
    </Badge>
  )
}
