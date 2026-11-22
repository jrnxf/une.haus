import { type ReactNode } from "react"

import { cn } from "~/lib/utils"

// A dense table in the style of the /metrics top users grid: a tinted
// header row, a border under each row and right-aligned numbers.

export function Table({ children }: { children: ReactNode }) {
  return <table className="w-full border-collapse text-xs">{children}</table>
}

export function Head({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-muted/40 text-muted-foreground border-b">
      <tr>{children}</tr>
    </thead>
  )
}

export function Body({ children }: { children: ReactNode }) {
  return <tbody className="divide-y">{children}</tbody>
}

export function Row({ children }: { children: ReactNode }) {
  return <tr className="hover:bg-muted/40 transition-colors">{children}</tr>
}

export function Th({
  numeric = false,
  dot,
  children,
}: {
  numeric?: boolean
  dot?: string
  children?: ReactNode
}) {
  return (
    <th
      className={cn(
        "h-8 px-2 font-medium whitespace-nowrap first:pl-4 last:pr-4",
        numeric ? "text-right" : "text-left",
      )}
    >
      {dot ? (
        <span
          className={cn(
            "inline-flex items-center gap-1",
            numeric && "justify-end",
          )}
        >
          <span className={cn("size-2 shrink-0 rounded-full", dot)} />
          {children}
        </span>
      ) : (
        children
      )}
    </th>
  )
}

export function Td({
  numeric = false,
  muted = false,
  className,
  children,
}: {
  numeric?: boolean
  muted?: boolean
  className?: string
  children?: ReactNode
}) {
  return (
    <td
      className={cn(
        "h-9 px-2 whitespace-nowrap first:pl-4 last:pr-4",
        numeric && "text-right tabular-nums",
        muted && "text-muted-foreground",
        className,
      )}
    >
      {children}
    </td>
  )
}

// A count in its series color, or a faint zero.
export function Count({ value, text }: { value: number; text: string }) {
  return value > 0 ? (
    <span className={cn("font-medium", text)}>{value.toLocaleString()}</span>
  ) : (
    <span className="text-muted-foreground/30">0</span>
  )
}
