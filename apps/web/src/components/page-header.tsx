import { Link, type LinkProps, useLocation } from "@tanstack/react-router"
import { Children, type ReactNode, useEffect } from "react"

import { CommandPalette } from "~/components/command-palette"
import { useSetMobileBreadcrumbs } from "~/components/mobile-breadcrumbs-context"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb"
import { SidebarTrigger } from "~/components/ui/sidebar"
import { useHaptics } from "~/lib/haptics"
import { cn } from "~/lib/utils"

function HeaderDivider() {
  return <div className="bg-border h-4 w-px" />
}

function PageHeaderRoot({
  children,
  maxWidth: _maxWidth,
}: {
  children?: ReactNode
  maxWidth?: string
}) {
  return (
    <>
      <header className="bg-background sticky top-0 z-30 hidden shrink-0 border-b md:block">
        <div
          className={cn(
            "mx-auto flex h-(--header-height) w-full items-center gap-2 px-4",
            // maxWidth,
          )}
        >
          <SidebarTrigger className="-ml-1" size="icon-xs" />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {children}
          </div>
        </div>
      </header>
      <CommandPalette />
    </>
  )
}

function BreadcrumbsContent({ children }: { children: ReactNode }) {
  const items = Children.toArray(children)
  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList>
        {items.map((child, i) => (
          <span key={i} className="contents">
            {i > 0 && <BreadcrumbSeparator className="shrink-0" />}
            <BreadcrumbItem
              className={i < items.length - 1 ? "shrink-0" : "min-w-0 truncate"}
            >
              {child}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function Breadcrumbs({ children }: { children: ReactNode }) {
  const setMobileBreadcrumbs = useSetMobileBreadcrumbs()

  useEffect(() => {
    setMobileBreadcrumbs(<BreadcrumbsContent>{children}</BreadcrumbsContent>)
    return () => setMobileBreadcrumbs(null)
  })

  return (
    <>
      <HeaderDivider />
      <BreadcrumbsContent>{children}</BreadcrumbsContent>
    </>
  )
}

function Right({ children }: { children: ReactNode }) {
  return <div className="ml-auto flex items-center gap-2">{children}</div>
}

function Crumb({
  to,
  icon: Icon,
  inert,
  children,
}: {
  to?: string
  icon?: React.ComponentType<{ className?: string }>
  inert?: boolean
  children: ReactNode
}) {
  if (to) {
    return (
      <BreadcrumbLink render={<Link to={to as LinkProps["to"]} />}>
        {Icon && <Icon className="mr-1.5 inline size-3.5" />}
        {children}
      </BreadcrumbLink>
    )
  }
  if (inert) {
    return <span className="text-muted-foreground text-sm">{children}</span>
  }
  return (
    <BreadcrumbPage className="flex min-w-0 items-center gap-1.5 font-medium">
      {Icon && (
        <span className="bg-muted text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded">
          <Icon className="size-3" />
        </span>
      )}
      <span className="truncate">{children}</span>
    </BreadcrumbPage>
  )
}

function Tabs({ children }: { children: ReactNode }) {
  return (
    <nav className="flex gap-1" aria-label="page sections">
      {children}
    </nav>
  )
}

function Tab({
  to,
  icon: Icon,
  children,
}: {
  to: string
  icon?: React.ComponentType<{ className?: string }>
  children: ReactNode
}) {
  const haptics = useHaptics()
  const pathname = useLocation({ select: (l) => l.pathname })
  const isActive = pathname.startsWith(to)

  return (
    <Link
      to={to}
      onClick={() => haptics.selection()}
      className={
        isActive
          ? "bg-secondary text-foreground flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition-colors"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition-colors"
      }
    >
      {Icon && <Icon className="size-3.5" />}
      <span>{children}</span>
    </Link>
  )
}

function Actions({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export const PageHeader = Object.assign(PageHeaderRoot, {
  Breadcrumbs,
  Crumb,
  Right,
  Tabs,
  Tab,
  Actions,
})
