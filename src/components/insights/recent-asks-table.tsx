import { MemberCell } from "~/components/insights/member-cell"
import { Panel, PanelEmpty } from "~/components/insights/panel"
import { Body, Head, Row, Table, Td, Th } from "~/components/insights/table"
import { Badge } from "~/components/ui/badge"
import { type AskError, type AskSource } from "~/lib/ask/schemas"
import { formatMoment, formatUsd } from "~/lib/insights/format"

type RecentAsk = {
  id: number
  user: { id: number; name: string; avatarId: string | null }
  createdAt: number
  source: AskSource
  tools: number
  costMicrousd: number
  error: AskError | null
}

const ERROR_LABELS: Record<AskError, string> = {
  limit: "daily limit",
  refusal: "refused",
  too_long: "too long",
  failed: "failed",
  stopped: "stopped",
}

export function RecentAsksTable({ data }: { data: RecentAsk[] }) {
  return (
    <Panel
      title="recent questions"
      hint="the last 20 questions. no question or answer text is saved, only these numbers"
      flush
    >
      {data.length === 0 ? (
        <PanelEmpty>no questions yet</PanelEmpty>
      ) : (
        <Table>
          <Head>
            <Th>time</Th>
            <Th>member</Th>
            <Th>from</Th>
            <Th numeric>tools</Th>
            <Th numeric>cost</Th>
            <Th>result</Th>
          </Head>
          <Body>
            {data.map((row) => (
              <Row key={row.id}>
                <Td muted className="tabular-nums">
                  {formatMoment(row.createdAt)}
                </Td>
                <Td>
                  <MemberCell member={row.user} />
                </Td>
                <Td muted>{row.source === "home" ? "home" : "/ask"}</Td>
                <Td numeric muted>
                  {row.tools}
                </Td>
                <Td numeric>{formatUsd(row.costMicrousd, 3)}</Td>
                <Td>
                  {row.error ? (
                    <Badge
                      variant={
                        row.error === "stopped" ? "secondary" : "destructive"
                      }
                    >
                      {ERROR_LABELS[row.error]}
                    </Badge>
                  ) : (
                    <Badge variant="success">answered</Badge>
                  )}
                </Td>
              </Row>
            ))}
          </Body>
        </Table>
      )}
    </Panel>
  )
}
