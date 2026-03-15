import { Link, useNavigate } from "@tanstack/react-router"
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useCallback } from "react"

import { ArrowLabel } from "~/components/arrow-label"
import { DataGrid } from "~/components/reui/data-grid/data-grid"
import { DataGridTable } from "~/components/reui/data-grid/data-grid-table"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { cn } from "~/lib/utils"

const STAT_COLS = [
  {
    key: "contentCount",
    label: "content",
    points: 5,
    dot: "bg-rose-500",
    text: "text-rose-500",
  },
  {
    key: "messagesCount",
    label: "messages",
    points: 2,
    dot: "bg-chart-4",
    text: "text-chart-4",
  },
  {
    key: "likesCount",
    label: "likes",
    points: 1,
    dot: "bg-chart-2",
    text: "text-chart-2",
  },
] as const

type Contributor = {
  id: number
  name: string
  avatarId: string | null
  contentCount: number
  messagesCount: number
  likesCount: number
  totalPoints: number
}

type TopContributorsProps = {
  data: Contributor[]
}

const columnHelper = createColumnHelper<Contributor>()

const columns = [
  columnHelper.display({
    id: "rank",
    header: "#",
    meta: {
      headerClassName: "w-[40px] min-w-[40px] max-w-[40px]",
      cellClassName: "w-[40px] min-w-[40px] max-w-[40px]",
    },
    enableSorting: false,
    cell: (info) => (
      <span className="text-muted-foreground tabular-nums">
        {info.row.index + 1}
      </span>
    ),
  }),
  columnHelper.accessor("name", {
    header: "user",
    meta: {
      headerClassName: "w-[140px] min-w-[140px] max-w-[140px]",
      cellClassName: "w-[140px] min-w-[140px] max-w-[140px]",
    },
    enableSorting: false,
    cell: (info) => (
      <span className="truncate font-medium">{info.getValue()}</span>
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
      meta: {
        headerClassName: "text-right",
        cellClassName: "text-right",
      },
      enableSorting: false,
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
    meta: {
      headerClassName: "text-right",
      cellClassName: "text-right",
    },
    enableSorting: false,
    cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
  }),
]

export function TopContributors({ data }: TopContributorsProps) {
  const navigate = useNavigate()

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const handleRowClick = useCallback(
    (contributor: Contributor) => {
      navigate({ to: "/users/$userId", params: { userId: contributor.id } })
    },
    [navigate],
  )

  if (data.length === 0) {
    return (
      <Card className="py-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium">top users</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">no users yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gap-0 divide-y overflow-hidden py-0">
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <CardTitle className="cursor-help text-sm font-medium">
              top users
            </CardTitle>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] text-xs">
            ranked by points: content (5pts), messages (2pts), likes (1pt)
          </TooltipContent>
        </Tooltip>
        <Button variant="ghost" size="sm" asChild className="-my-2">
          <Link to="/metrics/users" className="group">
            <ArrowLabel>view all</ArrowLabel>
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="overflow-auto p-0 text-xs">
        <DataGrid
          table={table}
          recordCount={data.length}
          onRowClick={handleRowClick}
          tableLayout={{
            dense: true,
            headerBackground: true,
            headerBorder: true,
            rowBorder: true,
          }}
        >
          <DataGridTable />
        </DataGrid>
      </CardContent>
    </Card>
  )
}
