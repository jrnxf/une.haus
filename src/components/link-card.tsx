import { Link } from "@tanstack/react-router"

import { ArrowLabel } from "~/components/arrow-label"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

function LinkCardRoot({
  href,
  children,
  className,
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      to={href}
      className="group focus-visible:border-ring focus-visible:ring-ring/50 block h-full rounded-xl outline-none focus-visible:ring-3"
    >
      <div
        className={cn(
          "bg-card text-card-foreground relative flex h-full cursor-pointer flex-col gap-2 rounded-xl border p-4",
          className,
        )}
      >
        {children}
      </div>
    </Link>
  )
}

function LinkCardHeader({
  icon: Icon,
  title,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  iconClassName?: string
}) {
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className="text-muted-foreground size-4" />}
      <p className="font-semibold">{title}</p>
    </div>
  )
}

function LinkCardDescription({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground min-w-0 flex-1 text-sm leading-relaxed">
      {children}
    </p>
  )
}

function LinkCardContent({ children }: { children: React.ReactNode }) {
  return <div className="flex items-end gap-2">{children}</div>
}

function LinkCardCta({ label }: { label: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="group-hover:bg-muted group-hover:text-foreground group-focus-visible:bg-muted group-focus-visible:text-foreground dark:group-focus-visible:bg-muted/70 dark:group-hover:bg-muted/70 pointer-events-none shrink-0"
    >
      <ArrowLabel>{label}</ArrowLabel>
    </Button>
  )
}

export const LinkCard = {
  Root: LinkCardRoot,
  Header: LinkCardHeader,
  Content: LinkCardContent,
  Description: LinkCardDescription,
  Cta: LinkCardCta,
}
