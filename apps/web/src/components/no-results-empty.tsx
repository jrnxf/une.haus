import { GhostIcon } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"

export function NoResultsEmpty() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <GhostIcon />
        </EmptyMedia>
        <EmptyTitle>no results</EmptyTitle>
        <EmptyDescription>try adjusting your filters</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
