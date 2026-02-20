import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "~/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { stats } from "~/lib/stats";
import { cn } from "~/lib/utils";

type Contributor = {
  id: number;
  name: string;
  avatarId: string | null;
  contentCount: number;
  messagesCount: number;
  likesCount: number;
  totalPoints: number;
};

const columnHelper = createColumnHelper<Contributor>();

const STAT_COLS = [
  {
    key: "contentCount" as const,
    label: "content",
    pts: 5,
    dot: "bg-rose-500",
    text: "text-rose-500",
  },
  {
    key: "messagesCount" as const,
    label: "messages",
    pts: 2,
    dot: "bg-chart-4",
    text: "text-chart-4",
  },
  {
    key: "likesCount" as const,
    label: "likes",
    pts: 1,
    dot: "bg-chart-2",
    text: "text-chart-2",
  },
];

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
    meta: { className: "w-[160px] min-w-[160px] max-w-[160px]" },
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
          <AvatarFallback name={info.getValue()} className="text-[9px]" />
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
          <span className="text-muted-foreground">&times;{col.pts}</span>
        </span>
      ),
      meta: { className: "text-right" },
      cell: (info) => {
        const val = info.getValue();
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
        );
      },
    }),
  ),
  columnHelper.accessor("totalPoints", {
    header: "pts",
    meta: { className: "text-right" },
    cell: (info) => (
      <span className="font-bold tabular-nums">{info.getValue()}</span>
    ),
  }),
];

export const Route = createFileRoute("/metrics/users")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      stats.contributors.queryOptions(),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: contributors } = useSuspenseQuery(
    stats.contributors.queryOptions(),
  );

  const [sorting, setSorting] = useState<SortingState>([
    { id: "totalPoints", desc: true },
  ]);

  const table = useReactTable({
    data: contributors,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/metrics">metrics</PageHeader.Crumb>
          <PageHeader.Crumb>users</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col p-4">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border">
          <div className="min-h-0 flex-1 overflow-auto text-xs">
            <Table containerClassName="overflow-visible">
              <TableHeader className="bg-card sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const meta = header.column.columnDef.meta as
                        | { className?: string }
                        | undefined;
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
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer">
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as
                        | { className?: string }
                        | undefined;
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
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </>
  );
}
