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

export function PagesTable({
  data,
}: {
  data: { route: string; views: number }[]
}) {
  return (
    <Panel
      title="top pages"
      hint="page views by route, from members and guests. a route groups every page of one kind, such as one per post"
      flush
    >
      {data.length === 0 ? (
        <PanelEmpty>no page views yet</PanelEmpty>
      ) : (
        <Table>
          <Head>
            <Th>route</Th>
            <Th numeric dot="bg-chart-2">
              views
            </Th>
          </Head>
          <Body>
            {data.map((row) => (
              <Row key={row.route}>
                <Td>
                  <code className="font-mono">{row.route}</code>
                </Td>
                <Td numeric>
                  <Count value={row.views} text="text-chart-2" />
                </Td>
              </Row>
            ))}
          </Body>
        </Table>
      )}
    </Panel>
  )
}
