import { type Table } from "@tanstack/react-table"
import React, { type ReactElement } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"

function DataGridColumnVisibility<TData>({
  table,
  trigger,
}: {
  table: Table<TData>
  trigger: ReactElement<Record<string, unknown>>
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end" className="min-w-[150px]">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-medium">
            Toggle Columns
          </DropdownMenuLabel>
          {table
            .getAllColumns()
            .filter(
              (column) =>
                typeof column.accessorFn !== "undefined" && column.getCanHide(),
            )
            .map((column) => {
              return (
                <DropdownMenuItem
                  key={column.id}
                  className="capitalize"
                  onClick={(event: React.MouseEvent) => {
                    event.preventDefault()
                    column.toggleVisibility(!column.getIsVisible())
                  }}
                >
                  {column.columnDef.meta?.headerTitle || column.id}
                </DropdownMenuItem>
              )
            })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { DataGridColumnVisibility }
