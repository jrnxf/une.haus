import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDownIcon, ArrowUpIcon, GhostIcon } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { useDebounceCallback } from "usehooks-ts";
import { z } from "zod";

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

const tricksSearchSchema = z.object({
  name: z.string().optional(),
  name_op: z.string().optional(),
  elements: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const arr =
        typeof val === "string" ? val.split(",").filter(Boolean) : val;
      return arr.length > 0 ? arr : undefined;
    }),
  elements_op: z.string().optional(),
});

export const Route = createFileRoute("/tricks/")({
  validateSearch: tricksSearchSchema,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(tricks.graph.queryOptions());
  },
  component: TricksListPage,
});

const columnHelper = createColumnHelper<Trick>();

const columns = [
  columnHelper.accessor("name", {
    header: "name",
    meta: { className: "w-[280px] min-w-[280px] max-w-[280px] truncate" },
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
                <span className="bg-muted-foreground/35 mx-0.5 inline-block size-0.5 rounded-full align-middle" />
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
    header: "description",
    cell: (info) => {
      const val = info.getValue();
      if (!val) return null;
      return val.length > 50 ? `${val.slice(0, 50)}...` : val;
    },
    meta: { className: "hidden md:table-cell truncate" },
  }),
  columnHelper.accessor("elements", {
    header: "elements",
    cell: (info) => {
      const elems = info.getValue();
      if (elems.length === 0) return null;
      return (
        <div className="flex gap-1">
          {elems.map((e) => (
            <Badge
              key={e}
              variant="secondary"
              className="px-1.5 py-0.5 text-xs md:px-2.5"
            >
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
  const searchParams = Route.useSearch();
  const router = useRouter();

  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);

  // --- Text filter: local state for immediate input feedback ---
  const [nameInput, setNameInput] = useState(searchParams.name ?? "");

  // URL update is for bookmarking only — debounced so it doesn't fire on every keystroke
  const debouncedNavigate = useDebounceCallback(
    (updates: {
      name?: string;
      name_op?: string;
      elements?: string[];
      elements_op?: string;
    }) => {
      router.navigate({
        to: "/tricks",
        search: (prev) => ({
          ...prev,
          name: updates.name || undefined,
          name_op: updates.name ? updates.name_op : undefined,
          elements:
            updates.elements && updates.elements.length > 0
              ? updates.elements
              : undefined,
          elements_op:
            updates.elements && updates.elements.length > 0
              ? updates.elements_op
              : undefined,
        }),
        replace: true,
      });
    },
    300,
  );

  // --- Multiselect filter: local state ---
  const [elements, setElements] = useState<string[]>(
    searchParams.elements ?? [],
  );

  // Track which filter fields are open (text filters can be open with empty value)
  const [activeFields, setActiveFields] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (nameInput) initial.add("name");
    if (elements.length > 0) initial.add("elements");
    return initial;
  });

  const [name_op, setName_op] = useState(searchParams.name_op ?? "contains");
  const [elements_op, setElements_op] = useState(
    searchParams.elements_op ?? "is_any_of",
  );

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

  // Derive filters from LOCAL state (immediate feedback, not URL)
  const filters = useMemo<Filter<string>[]>(() => {
    const result: Filter<string>[] = [];
    if (activeFields.has("name")) {
      result.push({
        id: "name",
        field: "name",
        operator: name_op,
        values: nameInput ? [nameInput] : [],
      });
    }
    if (activeFields.has("elements") || elements.length > 0) {
      result.push({
        id: "elements",
        field: "elements",
        operator: elements_op,
        values: elements,
      });
    }
    return result;
  }, [nameInput, elements, activeFields, name_op, elements_op]);

  const handleFiltersChange = useCallback(
    (next: Filter<string>[]) => {
      const nameFilter = next.find((f) => f.field === "name");
      const elementsFilter = next.find((f) => f.field === "elements");

      setActiveFields((prev) => {
        const wantName = Boolean(nameFilter);
        const wantElements = Boolean(elementsFilter);
        if (
          prev.has("name") === wantName &&
          prev.has("elements") === wantElements
        ) {
          return prev;
        }
        const s = new Set<string>();
        if (wantName) s.add("name");
        if (wantElements) s.add("elements");
        return s;
      });

      // Text: update local state immediately (URL updates via debounce)
      const newName = nameFilter?.values[0] || "";
      setNameInput(newName);
      if (nameFilter) setName_op(nameFilter.operator);

      // Multiselect: update local state immediately
      const newElements =
        elementsFilter && elementsFilter.values.length > 0
          ? elementsFilter.values
          : [];
      setElements(newElements);
      if (elementsFilter) setElements_op(elementsFilter.operator);

      // Debounce URL update
      debouncedNavigate({
        name: newName,
        name_op: nameFilter?.operator,
        elements: newElements,
        elements_op: elementsFilter?.operator,
      });
    },
    [debouncedNavigate],
  );

  const filteredTricks = useMemo(() => {
    let result = data.tricks.filter((t) => !t.isPrefix);

    for (const filter of filters) {
      if (filter.field === "name" && filter.values.length > 0) {
        const raw = (filter.values[0] || "").toLowerCase().trim();
        const q = raw.replaceAll(/[^a-z0-9]/g, "");
        if (q) {
          const strip = (s: string) =>
            s.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
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
              result = result.filter((t) => strip(t.name) === q);

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
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]!.start : 0;
  const paddingBottom =
    virtualRows.length > 0 ? totalSize - virtualRows.at(-1)!.end : 0;

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>tricks</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Right>
          <PageHeader.Actions>
            <Button asChild>
              <Link to="/tricks/create">Create</Link>
            </Button>
          </PageHeader.Actions>
        </PageHeader.Right>
      </PageHeader>

      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-4 p-4">
        <Filters
          filters={filters}
          fields={filterFields}
          onChange={handleFiltersChange}
          size="sm"
        />

        {filteredTricks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
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
          </div>
        ) : (
          <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border">
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-auto text-xs"
            >
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
                      <TableRow key={row.id} className="cursor-pointer">
                        {row.getVisibleCells().map((cell) => {
                          const meta = cell.column.columnDef.meta as
                            | { className?: string }
                            | undefined;
                          return (
                            <TableCell
                              key={cell.id}
                              className={cn(
                                "relative py-1.5",
                                meta?.className,
                              )}
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
          </div>
        )}
      </div>
    </>
  );
}
