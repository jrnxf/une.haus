import { type ReactNode } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { SectionDivider } from "~/components/ui/section-divider"
import { cn } from "~/lib/utils"

// One group of samples on /admin/sandbox. The id is the target of the
// jump links at the top of the page.
export function SandboxSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-16 space-y-4">
      <SectionDivider>{title}</SectionDivider>
      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @6xl:grid-cols-3">
        {children}
      </div>
    </section>
  )
}

// One card of samples. `wide` spans the whole row of the section grid.
export function Sample({
  title,
  wide = false,
  children,
}: {
  title: string
  wide?: boolean
  children: ReactNode
}) {
  return (
    <Card className={cn("min-w-0", wide && "@2xl:col-span-2 @6xl:col-span-3")}>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4">{children}</CardContent>
    </Card>
  )
}

// A captioned row inside a sample.
export function SampleRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {children}
      </div>
    </div>
  )
}
