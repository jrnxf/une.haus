import { Link, useNavigate } from "@tanstack/react-router"
import React, { type ReactNode, useState } from "react"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command"
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"

type User = {
  id: number
  name: string
  avatarId: string | null
}

type UsersDialogProps = {
  users: User[]
  title: string
  trigger?: ReactNode
  disabled?: boolean
  withSearch?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function UsersDialog({
  users,
  title: _title,
  trigger,
  disabled = false,
  withSearch = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: UsersDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const navigate = useNavigate()
  const isNavigatingRef = React.useRef(false)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled
    ? (controlledOnOpenChange ?? (() => {}))
    : setInternalOpen

  if (disabled || users.length === 0) {
    return <>{trigger}</>
  }

  if (withSearch) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-sm p-0">
          <Command className="bg-inherit">
            <CommandInput autoFocus placeholder="search users..." />
            <CommandList>
              <CommandEmpty>no users found.</CommandEmpty>
              <CommandGroup>
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.name}
                    onSelect={() => {
                      setOpen(false)
                      navigate({
                        to: "/users/$userId",
                        params: { userId: user.id },
                      })
                    }}
                  >
                    <span className="text-sm font-medium">{user.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        if (isNavigatingRef.current) {
          isNavigatingRef.current = false
        } else {
          setOpen(nextOpen)
        }
      }}
    >
      {trigger && <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>}
      <DropdownMenuContent
        align="center"
        className="max-h-[calc((var(--spacing)*8)*6+10px)] w-max"
      >
        {users.map((user) => (
          <DropdownMenuItem
            key={user.id}
            asChild
            onClick={() => {
              isNavigatingRef.current = true
            }}
          >
            <Link
              to="/users/$userId"
              params={{ userId: user.id }}
              className="flex items-center gap-2"
            >
              <span>{user.name}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
