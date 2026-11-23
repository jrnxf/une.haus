import { Panel } from "~/components/insights/panel"

/** A card of labeled numbers, one per line. */
export function NumberList({
  title,
  hint,
  rows,
}: {
  title: string
  hint?: string
  rows: { label: string; value: string }[]
}) {
  return (
    <Panel title={title} hint={hint}>
      <dl className="grid gap-2 text-sm">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4"
          >
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-medium tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}
