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
import { formatLastSeen, seriesColor } from "~/lib/insights/format"

type Member = {
  id: number
  name: string
  avatarId: string | null
  daysActive: number
  lastDay: string
  uses: number[]
}

export function MembersTable({
  today,
  features,
  members,
}: {
  today: string
  features: string[]
  members: Member[]
}) {
  return (
    <Panel
      title="who uses what"
      hint="views plus actions per member in each feature. the most used features get a column"
      flush
    >
      {members.length === 0 ? (
        <PanelEmpty>no use counted yet</PanelEmpty>
      ) : (
        <Table>
          <Head>
            <Th>member</Th>
            <Th numeric>days</Th>
            {features.map((feature, index) => (
              <Th key={feature} numeric dot={seriesColor(index).dot}>
                {feature}
              </Th>
            ))}
            <Th numeric>last seen</Th>
          </Head>
          <Body>
            {members.map((member) => (
              <Row key={member.id}>
                <Td>
                  <MemberCell member={member} />
                </Td>
                <Td numeric className="font-medium">
                  {member.daysActive}
                </Td>
                {member.uses.map((value, index) => (
                  <Td key={features[index]} numeric>
                    <Count value={value} text={seriesColor(index).text} />
                  </Td>
                ))}
                <Td numeric muted>
                  {formatLastSeen(member.lastDay, today)}
                </Td>
              </Row>
            ))}
          </Body>
        </Table>
      )}
    </Panel>
  )
}
