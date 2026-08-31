import { type ReactNode } from "react"

import { Metaline } from "~/components/ui/metaline"

function DetailHeaderRoot({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4">
      {children}
    </div>
  )
}

function Title({
  children,
  meta,
}: {
  children: ReactNode
  meta?: ReactNode[]
}) {
  return (
    <div className="min-w-0 space-y-1">
      <h1 className="truncate text-base font-semibold sm:text-xl">
        {children}
      </h1>
      {meta && <Metaline className="text-xs sm:text-sm" parts={meta} />}
    </div>
  )
}

function Actions({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
      {children}
    </div>
  )
}

export const DetailHeader = Object.assign(DetailHeaderRoot, {
  Title,
  Actions,
})
