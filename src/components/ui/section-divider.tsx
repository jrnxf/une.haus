import { type ReactNode } from "react"

import { Separator } from "~/components/ui/separator"

export function SectionDivider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <Separator className="flex-1" />
      <span className="text-muted-foreground px-2 text-xs italic">
        {children}
      </span>
      <Separator className="flex-1" />
    </div>
  )
}
