import { Panel, PanelEmpty } from "~/components/insights/panel"
import { Body, Head, Row, Table, Td, Th } from "~/components/insights/table"
import {
  formatMs,
  type Rating,
  rateVital,
  type SpeedRow,
  type Vital,
} from "~/lib/traffic/shape"

const RATING_TEXT: Record<Rating, string> = {
  good: "text-success",
  ok: "text-warning",
  poor: "text-destructive",
}

const RATING_WORD: Record<Rating, string> = {
  good: "good",
  ok: "needs work",
  poor: "poor",
}

function Score({
  vital,
  value,
  format,
}: {
  vital: Vital
  value: number | null
  format: (value: number) => string
}) {
  if (value === null) {
    return (
      <span className="text-muted-foreground/30">
        <span aria-hidden>-</span>
        <span className="sr-only">no data</span>
      </span>
    )
  }
  const rating = rateVital(vital, value)
  return (
    <span className={RATING_TEXT[rating]} title={RATING_WORD[rating]}>
      {format(value)}
      <span className="sr-only">, {RATING_WORD[rating]}</span>
    </span>
  )
}

export function SpeedTable({ data }: { data: SpeedRow[] }) {
  return (
    <Panel
      title="page speed"
      hint="the 75th percentile of real visits per kind of page, slowest first. green is good, amber needs work, red is poor, by google's core web vitals limits. pages of one kind are averaged by their samples"
      flush
    >
      {data.length === 0 ? (
        <PanelEmpty>no speed data yet</PanelEmpty>
      ) : (
        <Table>
          <Head>
            <Th>page</Th>
            <Th numeric>samples</Th>
            <Th numeric>largest paint</Th>
            <Th numeric>click delay</Th>
            <Th numeric>layout shift</Th>
          </Head>
          <Body>
            {data.map((row) => (
              <Row key={row.route}>
                <Td className="whitespace-normal">
                  <code className="font-mono wrap-anywhere">{row.route}</code>
                </Td>
                <Td numeric muted>
                  {row.samples.toLocaleString("en-US")}
                </Td>
                <Td numeric>
                  <Score vital="lcpMs" value={row.lcpMs} format={formatMs} />
                </Td>
                <Td numeric>
                  <Score vital="inpMs" value={row.inpMs} format={formatMs} />
                </Td>
                <Td numeric>
                  <Score
                    vital="cls"
                    value={row.cls}
                    format={(value) => value.toFixed(2)}
                  />
                </Td>
              </Row>
            ))}
          </Body>
        </Table>
      )}
    </Panel>
  )
}
