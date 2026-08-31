import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useCallback, useRef, useState } from "react"

import { PageHeader } from "~/components/page-header"
import {
  DataGrid,
  DataGridContainer,
} from "~/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "~/components/reui/data-grid/data-grid-column-header"
import {
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRow,
  DataGridTableBodyRowCell,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
} from "~/components/reui/data-grid/data-grid-table"
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

const columnHelper = createColumnHelper<Contributor>()

const columns = [
  columnHelper.display({
    id: "rank",
    header: "#",
    meta: {
      headerClassName: "w-[48px] min-w-[48px] max-w-[48px]",
      cellClassName: "w-[48px] min-w-[48px] max-w-[48px]",
    },
    enableSorting: false,
    cell: (info) => (
      <span className="text-muted-foreground tabular-nums">
        {info.row.index + 1}
      </span>
    ),
  }),
  columnHelper.accessor("name", {
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="user" />
    ),
    meta: {
      headerClassName: "w-[200px] min-w-[200px] max-w-[200px]",
      cellClassName: "w-[200px] min-w-[200px] max-w-[200px]",
    },
    cell: (info) => (
      <span className="truncate font-medium">{info.getValue()}</span>
    ),
  }),
  ...STAT_COLS.map((col) =>
    columnHelper.accessor(col.key, {
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title=""
          className="justify-end"
          icon={
            <span className="flex items-center gap-1.5">
              <span className={cn("size-2 shrink-0 rounded-full", col.dot)} />
              {col.label}
              <span className="text-muted-foreground">&times;{col.points}</span>
            </span>
          }
        />
      ),
      meta: {
        headerClassName: "text-right",
        cellClassName: "text-right",
      },
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
    header: ({ column }) => (
      <DataGridColumnHeader
        column={column}
        title="points"
        className="justify-end"
      />
    ),
    meta: {
      headerClassName: "text-right",
      cellClassName: "text-right",
    },
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
  const navigate = useNavigate()

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

  const handleRowClick = useCallback(
    (contributor: Contributor) => {
      navigate({ to: "/users/$userId", params: { userId: contributor.id } })
    },
    [navigate],
  )

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/metrics">metrics</PageHeader.Crumb>
          <PageHeader.Crumb>users</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="mx-auto flex min-h-0 w-full flex-1 flex-col p-4">
        <DataGrid
          table={table}
          recordCount={contributors.length}
          onRowClick={handleRowClick}
          tableLayout={{
            dense: true,
            headerSticky: true,
            headerBackground: true,
            headerBorder: true,
            rowBorder: true,
          }}
        >
          <DataGridContainer className="flex min-h-0 flex-1 flex-col">
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-auto overscroll-none"
            >
              <DataGridTableBase>
                <DataGridTableHead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <DataGridTableHeadRow
                      key={headerGroup.id}
                      headerGroup={headerGroup}
                    >
                      {headerGroup.headers.map((header) => (
                        <DataGridTableHeadRowCell
                          key={header.id}
                          header={header}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </DataGridTableHeadRowCell>
                      ))}
                    </DataGridTableHeadRow>
                  ))}
                </DataGridTableHead>
                <DataGridTableBody>
                  {paddingTop > 0 && (
                    <tr>
                      <td style={{ height: paddingTop }} />
                    </tr>
                  )}
                  {virtualRows.map((virtualRow) => {
                    const row = rows[virtualRow.index]!
                    return (
                      <DataGridTableBodyRow key={row.id} row={row}>
                        {row.getVisibleCells().map((cell) => (
                          <DataGridTableBodyRowCell key={cell.id} cell={cell}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </DataGridTableBodyRowCell>
                        ))}
                      </DataGridTableBodyRow>
                    )
                  })}
                  {paddingBottom > 0 && (
                    <tr>
                      <td style={{ height: paddingBottom }} />
                    </tr>
                  )}
                </DataGridTableBody>
              </DataGridTableBase>
            </div>
          </DataGridContainer>
        </DataGrid>
      </div>
    </>
  )
}
