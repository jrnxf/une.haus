import { PageHeader } from "~/components/page-header"
import { useNavCounts } from "~/hooks/use-nav-counts"

/** The top-level sections of the admin area. */
export function AdminTabs() {
  const { adminPendingCount } = useNavCounts()

  return (
    <PageHeader.Tabs>
      <PageHeader.Tab to="/admin" exact keepSearch>
        overview
      </PageHeader.Tab>
      <PageHeader.Tab to="/admin/queue" keepSearch count={adminPendingCount}>
        queue
      </PageHeader.Tab>
      <PageHeader.Tab to="/admin/ask" keepSearch>
        ask
      </PageHeader.Tab>
      <PageHeader.Tab to="/admin/sandbox" keepSearch>
        sandbox
      </PageHeader.Tab>
    </PageHeader.Tabs>
  )
}
