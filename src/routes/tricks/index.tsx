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
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  FilterIcon,
  FunnelXIcon,
  GhostIcon,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { PageHeader } from "~/components/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  Filters,
  type Filter,
  type FilterFieldConfig,
} from "~/components/ui/filters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { tricks, type Trick } from "~/lib/tricks";
import { cn } from "~/lib/utils";


export const Route = createFileRoute("/tricks/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(tricks.graph.queryOptions());
  },
  component: TricksListPage,
});

const columnHelper = createColumnHelper<Trick>();

const columns = [
  columnHelper.accessor("name", {
    header: "Name",
    size: 200,
    cell: (info) => (
      <Link
        to="/tricks/$trickId"
        params={{ trickId: info.row.original.id }}
        className="font-medium after:absolute after:inset-0 after:content-['']"
      >
        {info
          .getValue()
          .split("-")
          .map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                <span className="mx-0.5 inline-block size-0.5 rounded-full bg-muted-foreground/35 align-middle" />
              )}
            </span>
          ))}
      </Link>
    ),
    sortingFn: (a, b) => {
      const aName = a.original.name;
      const bName = b.original.name;
      const aNum = /^\d/.test(aName);
      const bNum = /^\d/.test(bName);
      if (aNum !== bNum) return aNum ? 1 : -1;
      if (aNum && bNum) {
        const aVal = Number.parseInt(aName, 10);
        const bVal = Number.parseInt(bName, 10);
        if (aVal !== bVal) return aVal - bVal;
      }
      return aName.localeCompare(bName);
    },
  }),
  columnHelper.accessor("definition", {
    header: "Description",
    cell: (info) => {
      const val = info.getValue();
      if (!val) return null;
      return val.length > 50 ? `${val.slice(0, 50)}...` : val;
    },
    meta: { className: "hidden md:table-cell" },
  }),
  columnHelper.accessor("elements", {
    header: "Elements",
    size: 200,
    cell: (info) => {
      const elems = info.getValue();
      if (elems.length === 0) return null;
      return (
        <div className="flex gap-1">
          {elems.map((e) => (
            <Badge key={e} variant="secondary" className="text-xs px-1.5 py-0.5 md:px-2.5">
              {e}
            </Badge>
          ))}
        </div>
      );
    },
    enableSorting: false,
  }),
];

function TricksListPage() {

  const { data } = useSuspenseQuery(tricks.graph.queryOptions());

  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);

  const [filters, setFilters] = useState<Filter<string>[]>([]);

  const handleFiltersChange = useCallback((next: Filter<string>[]) => {
    setFilters(next);
  }, []);

  // Build filter field config from available elements
  const filterFields: FilterFieldConfig<string>[] = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        type: "text" as const,
        placeholder: "search...",
        operators: [
          { value: "contains", label: "contains" },
          { value: "starts_with", label: "starts with" },
          { value: "is", label: "is exactly" },
        ],
        defaultOperator: "contains",
      },
      {
        key: "elements",
        label: "Elements",
        type: "multiselect" as const,
        searchable: false,
        operators: [
          { value: "is_any_of", label: "includes" },
          { value: "includes_all", label: "is exactly" },
        ],
        defaultOperator: "is_any_of",
        options: data.elements.map((e) => ({ value: e, label: e })),
      },
    ],
    [data.elements],
  );

  const filteredTricks = useMemo(() => {
    let result = data.tricks.filter((t) => !t.isPrefix);

    for (const filter of filters) {
      if (filter.field === "name" && filter.values.length > 0) {
        const raw = (filter.values[0] || "").toLowerCase().trim();
        const q = raw.replace(/[^a-z0-9]/g, "");
        if (q) {
          const strip = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
          switch (filter.operator) {
            case "contains": {
              result = result.filter(
                (t) =>
                  strip(t.name).includes(q) ||
                  t.alternateNames.some((n) => strip(n).includes(q)),
              );

              break;
            }
            case "starts_with": {
              result = result.filter(
                (t) =>
                  strip(t.name).startsWith(q) ||
                  t.alternateNames.some((n) => strip(n).startsWith(q)),
              );

              break;
            }
            case "is": {
              result = result.filter(
                (t) => strip(t.name) === q,
              );

              break;
            }
            // No default
          }
        }
      }

      if (filter.field === "elements" && filter.values.length > 0) {
        if (filter.operator === "is_any_of") {
          result = result.filter((t) =>
            filter.values.some((v) => t.elements.includes(v)),
          );
        } else if (filter.operator === "includes_all") {
          result = result.filter((t) => {
            const trickSet = new Set(t.elements);
            const filterSet = new Set(filter.values);
            if (trickSet.size !== filterSet.size) return false;
            for (const v of filterSet) {
              if (!trickSet.has(v)) return false;
            }
            return true;
          });
        }
      }
    }

    return result;
  }, [data.tricks, filters]);

  const table = useReactTable({
    data: filteredTricks,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32,
    overscan: 20,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop =
    virtualRows.length > 0 ? virtualRows[0]!.start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - virtualRows.at(-1)!.end
      : 0;

  return (
    <>
      <PageHeader maxWidth="full">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>tricks</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Actions>
          <Button asChild variant="outline" size="sm">
            <Link to="/tricks/glossary">Glossary</Link>
          </Button>
        </PageHeader.Actions>
      </PageHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex shrink-0 items-start gap-2">
          <div className="flex-1">
            <Filters
              filters={filters}
              fields={filterFields}
              onChange={handleFiltersChange}
              allowMultiple={false}
              searchable={false}
              size="sm"
              trigger={
                <Button variant="outline" size="sm">
                  <FilterIcon className="size-3.5" />
                  filters
                </Button>
              }
            />
          </div>
          {filters.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters([])}
            >
              <FunnelXIcon className="size-3.5" />
              Clear
            </Button>
          )}
        </div>

        {filteredTricks.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <GhostIcon />
              </EmptyMedia>
              <EmptyTitle>no tricks found</EmptyTitle>
            </EmptyHeader>
            <p className="text-muted-foreground text-sm">
              try adjusting your filters
            </p>
          </Empty>
        ) : (
          <>
            <div
              ref={scrollRef}
              className="min-h-0 overflow-auto rounded-lg border text-xs"
            >
              <Table containerClassName="overflow-visible" className="table-fixed">
                <TableHeader className="sticky top-0 z-10 bg-card">
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
                  {paddingTop > 0 && (
                    <tr>
                      <td style={{ height: paddingTop }} />
                    </tr>
                  )}
                  {virtualRows.map((virtualRow) => {
                    const row = rows[virtualRow.index]!;
                    return (
                      <TableRow
                        key={row.id}
                        className="relative cursor-pointer"
                      >
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
                    );
                  })}
                  {paddingBottom > 0 && (
                    <tr>
                      <td style={{ height: paddingBottom }} />
                    </tr>
                  )}
                </TableBody>
              </Table>
            </div>

            <p className="text-muted-foreground shrink-0 text-sm">
              {filteredTricks.length} tricks
            </p>
          </>
        )}
      </div >
    </>
  );
}
