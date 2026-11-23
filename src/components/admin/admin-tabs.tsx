import { PageHeader } from "~/components/page-header"

/** The top-level sections of the admin area. */
export function AdminTabs() {
  return (
    <PageHeader.Tabs>
      <PageHeader.Tab to="/admin" exact>
        queue
      </PageHeader.Tab>
      <PageHeader.Tab to="/admin/insights">insights</PageHeader.Tab>
      <PageHeader.Tab to="/admin/sandbox">sandbox</PageHeader.Tab>
    </PageHeader.Tabs>
  )
}
