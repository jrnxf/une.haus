import { flexRender, type Table } from "@tanstack/react-table"

import { DataGridContainer } from "~/components/reui/data-grid/data-grid"
import {
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRow,
  DataGridTableBodyRowCell,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
} from "~/components/reui/data-grid/data-grid-table"
import { cn } from "~/lib/utils"

import type { Virtualizer } from "@tanstack/react-virtual"
import type { RefObject } from "react"

type VirtualizedDataGridTableProps<TData> = {
  table: Table<TData>
  virtualizer: Virtualizer<HTMLDivElement, Element>
  scrollRef: RefObject<HTMLDivElement | null>
  className?: string
}

export function VirtualizedDataGridTable<TData>({
  table,
  virtualizer,
  scrollRef,
  className,
}: VirtualizedDataGridTableProps<TData>) {
  const rows = table.getRowModel().rows
  const virtualRows = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()
  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0
  const paddingBottom =
    virtualRows.length > 0 ? totalSize - (virtualRows.at(-1)?.end ?? 0) : 0

  return (
    <DataGridContainer
      className={cn("flex min-h-0 flex-1 flex-col", className)}
    >
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
                  <DataGridTableHeadRowCell key={header.id} header={header}>
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
              const row = rows[virtualRow.index]
              if (!row) return null
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
  )
}
