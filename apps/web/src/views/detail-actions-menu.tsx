import {
  EllipsisVerticalIcon,
  FlagIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
} from "lucide-react"
import { type ReactElement, type ReactNode, useState } from "react"
import { toast } from "sonner"

import { confirm } from "~/components/confirm-dialog"
import { FlagTray } from "~/components/flag-tray"
import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { useHaptics } from "~/lib/haptics"

import type { FlagEntityType } from "~/db/schema"

type DetailActionsMenuProps = {
  // The flag item + tray. Rendered only when provided — callers compute the
  // permission gate. Omit entirely for entities that can't be flagged.
  flag?: { entityType: FlagEntityType; entityId: number }
  // The edit item's link element, e.g.
  // <Link to="/posts/$postId/edit" params={{ postId }} aria-label="edit" />.
  // Rendered only when provided — callers compute the permission gate.
  edit?: ReactElement
  // Delete item. `noun` fills the confirm title and body; `run` performs the deletion.
  onDelete?: { noun: string; run: () => void }
  // Extra items rendered at the top of the menu, before share (e.g. the sius stack-info item).
  leadingItems?: ReactNode
}

export function DetailActionsMenu({
  flag,
  edit,
  onDelete,
  leadingItems,
}: DetailActionsMenuProps) {
  const haptics = useHaptics()
  const [flagOpen, setFlagOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="icon-sm" variant="outline" aria-label="actions" />
          }
        >
          <EllipsisVerticalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {leadingItems}
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(globalThis.location.href)
              haptics.success()
              toast.success("link copied")
            }}
          >
            <ShareIcon />
            share
          </DropdownMenuItem>
          {flag && (
            <DropdownMenuItem onClick={() => setFlagOpen(true)}>
              <FlagIcon />
              flag
            </DropdownMenuItem>
          )}
          {edit && (
            <DropdownMenuItem render={edit}>
              <PencilIcon />
              edit
            </DropdownMenuItem>
          )}
          {onDelete && (
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                confirm.open({
                  title: `delete ${onDelete.noun}`,
                  description: `are you sure you want to delete this ${onDelete.noun}? this action cannot be undone.`,
                  confirmText: "delete",
                  onConfirm: onDelete.run,
                })
              }
            >
              <TrashIcon />
              delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {flag && (
        <FlagTray
          entityType={flag.entityType}
          entityId={flag.entityId}
          hideTrigger
          open={flagOpen}
          onOpenChange={setFlagOpen}
        />
      )}
    </>
  )
}
