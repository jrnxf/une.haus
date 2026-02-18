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

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { stats } from "~/lib/stats";
import { cn } from "~/lib/utils";

type Contributor = {
  id: number;
  name: string;
  avatarId: string | null;
  riuSetsCount: number;
  riuSubmissionsCount: number;
  biuSetsCount: number;
  siuStacksCount: number;
  postsCount: number;
  messagesCount: number;
  likesCount: number;
  totalPoints: number;
};

const columnHelper = createColumnHelper<Contributor>();

const STAT_COLS = [
  { key: "riuSetsCount" as const, label: "riu sets", pts: 5, dot: "bg-rose-500", text: "text-rose-500" },
  { key: "riuSubmissionsCount" as const, label: "riu subs", pts: 5, dot: "bg-orange-500", text: "text-orange-500" },
  { key: "biuSetsCount" as const, label: "biu sets", pts: 5, dot: "bg-amber-500", text: "text-amber-500" },
  { key: "siuStacksCount" as const, label: "siu stacks", pts: 5, dot: "bg-lime-500", text: "text-lime-500" },
  { key: "postsCount" as const, label: "posts", pts: 5, dot: "bg-chart-3", text: "text-chart-3" },
  { key: "messagesCount" as const, label: "messages", pts: 2, dot: "bg-chart-4", text: "text-chart-4" },
  { key: "likesCount" as const, label: "likes", pts: 1, dot: "bg-chart-2", text: "text-chart-2" },
];

const columns = [
  columnHelper.display({
    id: "rank",
    header: "#",
    size: 48,
    enableSorting: false,
    cell: (info) => (
      <span className="text-muted-foreground tabular-nums">
        {info.row.index + 1}
      </span>
    ),
  }),
  columnHelper.accessor("name", {
    header: "user",
    size: 160,
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
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex w-full justify-center">
              <div className={cn("size-2 rounded-full", col.dot)} />
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-xs">
            {col.label} ({col.pts}pts)
          </TooltipContent>
        </Tooltip>
      ),
      size: 52,
      meta: { className: "text-center hidden md:table-cell" },
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
    size: 56,
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
  staticData: {
    pageHeader: {
      breadcrumbs: [
        { label: "metrics", to: "/metrics" },
        { label: "users" },
      ],
      maxWidth: "full",
    },
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
    <div className="min-h-0 flex-1 overflow-auto text-xs">
      <Table containerClassName="overflow-visible" className="table-fixed">
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
                    style={{ width: header.getSize() }}
                    className={cn(
                      header.column.getCanSort() &&
                        "cursor-pointer select-none",
                      meta?.className,
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className="flex items-center gap-1">
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
            <TableRow key={row.id} className="relative cursor-pointer">
              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta as
                  | { className?: string }
                  | undefined;
                return (
                  <TableCell
                    key={cell.id}
                    className={cn("py-1.5", meta?.className)}
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
  );
}
