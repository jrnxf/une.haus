import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"
import { useRef, useState } from "react"

import { PageHeader } from "~/components/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { stats } from "~/lib/stats"
import { cn } from "~/lib/utils"

type Contributor = {
  id: number
  name: string
  avatarId: string | null
  contentCount: number
  messagesCount: number
  likesCount: number
  totalPoints: number
}

const columnHelper = createColumnHelper<Contributor>()

const STAT_COLS = [
  {
    key: "contentCount" as const,
    label: "content",
    points: 5,
    dot: "bg-rose-500",
    text: "text-rose-500",
  },
  {
    key: "messagesCount" as const,
    label: "messages",
    points: 2,
    dot: "bg-chart-4",
    text: "text-chart-4",
  },
  {
    key: "likesCount" as const,
    label: "likes",
    points: 1,
    dot: "bg-chart-2",
    text: "text-chart-2",
  },
]

const columns = [
  columnHelper.display({
    id: "rank",
    header: "#",
    meta: { className: "w-[48px] min-w-[48px] max-w-[48px]" },
    enableSorting: false,
    cell: (info) => (
      <span className="text-muted-foreground tabular-nums">
        {info.row.index + 1}
      </span>
    ),
  }),
  columnHelper.accessor("name", {
    header: "user",
    meta: { className: "w-[200px] min-w-[200px] max-w-[200px]" },
    cell: (info) => (
      <Link
        to="/users/$userId"
        params={{ userId: info.row.original.id }}
        className="flex items-center gap-2 after:absolute after:inset-0 after:content-['']"
      >
        <Avatar
          className="size-5"
          cloudflareId={info.row.original.avatarId}
          alt={info.getValue()}
        >
          <AvatarImage width={40} quality={80} />
          <AvatarFallback name={info.getValue()} />
        </Avatar>
        <span className="truncate font-medium">{info.getValue()}</span>
      </Link>
    ),
  }),
  ...STAT_COLS.map((col) =>
    columnHelper.accessor(col.key, {
      header: () => (
        <span className="flex items-center justify-end gap-1.5">
          <span className={cn("size-2 shrink-0 rounded-full", col.dot)} />
          {col.label}
          <span className="text-muted-foreground">&times;{col.points}</span>
        </span>
      ),
      meta: { className: "text-right" },
      cell: (info) => {
        const val = info.getValue()
        return (
          <span
            className={cn(
              "tabular-nums",
              val > 0
                ? cn("font-medium", col.text)
                : "text-muted-foreground/30",
            )}
          >
            {val}
          </span>
        )
      },
    }),
  ),
  columnHelper.accessor("totalPoints", {
    header: "points",
    meta: { className: "text-right" },
    cell: (info) => (
      <span className="font-bold tabular-nums">{info.getValue()}</span>
    ),
  }),
]

export const Route = createFileRoute("/metrics/users")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(stats.contributors.queryOptions())
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { data: contributors } = useSuspenseQuery(
    stats.contributors.queryOptions(),
  )

  const [sorting, setSorting] = useState<SortingState>([
    { id: "totalPoints", desc: true },
  ])

  const table = useReactTable({
    data: contributors,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const rows = table.getRowModel().rows
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32,
    overscan: 20,
    initialRect: { width: 0, height: 800 },
  })

  const virtualRows = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start : 0
  const paddingBottom =
    virtualRows.length > 0 ? totalSize - (virtualRows.at(-1)?.end ?? 0) : 0

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/metrics">metrics</PageHeader.Crumb>
          <PageHeader.Crumb>users</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="mx-auto flex min-h-0 w-full flex-1 flex-col p-4">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border">
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-auto overscroll-none text-xs"
          >
            <Table containerClassName="overflow-visible">
              <TableHeader className="bg-table-header sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const meta = header.column.columnDef.meta as
                        | { className?: string }
                        | undefined
                      return (
                        <TableHead
                          key={header.id}
                          className={cn(
                            header.column.getCanSort() &&
                              "cursor-pointer select-none",
                            meta?.className,
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <span
                            className={cn(
                              "flex items-center gap-1",
                              meta?.className?.includes("text-right") &&
                                "justify-end",
                            )}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {{
                              asc: <ArrowUpIcon className="size-3.5" />,
                              desc: <ArrowDownIcon className="size-3.5" />,
                            }[header.column.getIsSorted() as string] ?? null}
                          </span>
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {paddingTop > 0 && (
                  <tr>
                    <td style={{ height: paddingTop }} />
                  </tr>
                )}
                {virtualRows.map((virtualRow) => {
                  const row = rows[virtualRow.index]!
                  return (
                    <TableRow key={row.id} className="cursor-pointer">
                      {row.getVisibleCells().map((cell) => {
                        const meta = cell.column.columnDef.meta as
                          | { className?: string }
                          | undefined
                        return (
                          <TableCell
                            key={cell.id}
                            className={cn("relative py-1.5", meta?.className)}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  )
                })}
                {paddingBottom > 0 && (
                  <tr>
                    <td style={{ height: paddingBottom }} />
                  </tr>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </>
  )
}
