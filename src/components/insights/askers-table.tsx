import { MemberCell } from "~/components/insights/member-cell"
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
import { DAILY_BUDGET_MICROUSD } from "~/lib/ask/cost"
import { formatMoment, formatUsd } from "~/lib/insights/format"

type Asker = {
  id: number
  name: string
  avatarId: string | null
  questions: number
  spendMicrousd: number
  peakMicrousd: number
  lastAt: number
}

export function AskersTable({ data }: { data: Asker[] }) {
  return (
    <Panel
      title="top askers"
      hint={`members who asked the most questions. peak day is their most expensive day against the ${formatUsd(DAILY_BUDGET_MICROUSD, 0)} daily limit`}
      flush
    >
      {data.length === 0 ? (
        <PanelEmpty>no questions yet</PanelEmpty>
      ) : (
        <Table>
          <Head>
            <Th>#</Th>
            <Th>member</Th>
            <Th numeric dot="bg-chart-1">
              questions
            </Th>
            <Th numeric dot="bg-chart-2">
              spend
            </Th>
            <Th numeric>peak day</Th>
            <Th numeric>last asked</Th>
          </Head>
          <Body>
            {data.map((row, index) => (
              <Row key={row.id}>
                <Td muted numeric>
                  {index + 1}
                </Td>
                <Td>
                  <MemberCell member={row} />
                </Td>
                <Td numeric>
                  <Count value={row.questions} text="text-chart-1" />
                </Td>
                <Td numeric className="text-chart-2 font-medium">
                  {formatUsd(row.spendMicrousd)}
                </Td>
                <Td numeric muted>
                  {formatUsd(row.peakMicrousd)} (
                  {Math.min(
                    100,
                    Math.round(
                      (row.peakMicrousd * 100) / DAILY_BUDGET_MICROUSD,
                    ),
                  )}
                  %)
                </Td>
                <Td numeric muted>
                  {formatMoment(row.lastAt)}
                </Td>
              </Row>
            ))}
          </Body>
        </Table>
      )}
    </Panel>
  )
}
