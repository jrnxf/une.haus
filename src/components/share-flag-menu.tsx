import { MoreHorizontalIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

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

type ShareFlagMenuProps = {
  canFlag?: boolean
  entityId: number
  entityType: FlagEntityType
  parentEntityId?: number
}

export function ShareFlagMenu({
  canFlag = false,
  entityId,
  entityType,
  parentEntityId,
}: ShareFlagMenuProps) {
  const haptics = useHaptics()
  const [flagOpen, setFlagOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="outline" aria-label="more actions">
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(globalThis.location.href)
              haptics.success()
              toast.success("link copied")
            }}
          >
            share
          </DropdownMenuItem>
          {canFlag && (
            <DropdownMenuItem onClick={() => setFlagOpen(true)}>
              flag
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canFlag && (
        <FlagTray
          entityType={entityType}
          entityId={entityId}
          parentEntityId={parentEntityId}
          hideTrigger
          open={flagOpen}
          onOpenChange={setFlagOpen}
        />
      )}
    </>
  )
}
