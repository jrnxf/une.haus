import { Link } from "@tanstack/react-router"
import { EllipsisVerticalIcon } from "lucide-react"
import { type ReactNode } from "react"

import { confirm } from "~/components/confirm-dialog"
import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { useDeleteTournament } from "~/lib/tourney/hooks"

type GoToItem = {
  label: string
  onClick: () => void
  disabled?: boolean
}

type TourneyAdminMenuProps = {
  code: string
  goTo?: GoToItem[]
  children?: ReactNode
}

export function TourneyAdminMenu({
  code,
  goTo,
  children,
}: TourneyAdminMenuProps) {
  const deleteMutation = useDeleteTournament()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" />}>
        <EllipsisVerticalIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {goTo && goTo.length > 0 && (
          <>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>go to</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {goTo.map((item) => (
                  <DropdownMenuItem
                    key={item.label}
                    onClick={item.onClick}
                    disabled={item.disabled}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
          </>
        )}
        {children && (
          <>
            {children}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          render={<Link to="/tourney/$code/edit" params={{ code }} />}
        >
          edit
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() =>
            confirm.open({
              title: "delete tournament",
              description:
                "are you sure you want to delete this tournament? this action cannot be undone.",
              confirmText: "delete",
              variant: "destructive",
              onConfirm: () => {
                deleteMutation.mutate({ data: { code } })
              },
            })
          }
        >
          delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
