import { FlagIcon } from "lucide-react"
import { useState } from "react"

import { Tray, TrayContent, TrayTrigger } from "~/components/tray"
import { Button } from "~/components/ui/button"
import { Label } from "~/components/ui/label"
import { Textarea } from "~/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { useFlagContent } from "~/lib/flags/hooks"

import type { FlagEntityType } from "~/db/schema"

type FlagTrayProps = {
  entityType: FlagEntityType
  entityId: number
  parentEntityId?: number
  placeholder?: string
}

export function FlagTray({
  entityType,
  entityId,
  parentEntityId,
  placeholder = "explain why this should be reviewed",
}: FlagTrayProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const flagContent = useFlagContent()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return
    flagContent.mutate(
      {
        data: {
          entityType,
          entityId,
          reason,
          parentEntityId,
        },
      },
      {
        onSuccess: () => {
          setReason("")
          setOpen(false)
        },
      },
    )
  }

  return (
    <Tray open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <TrayTrigger asChild>
            <Button variant="outline" size="icon-sm" aria-label="flag">
              <FlagIcon className="size-4" />
            </Button>
          </TrayTrigger>
        </TooltipTrigger>
        <TooltipContent>flag</TooltipContent>
      </Tooltip>
      <TrayContent>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={placeholder}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              cancel
            </Button>
            <Button
              type="submit"
              disabled={!reason.trim() || flagContent.isPending}
            >
              {flagContent.isPending ? "submitting..." : "submit"}
            </Button>
          </div>
        </form>
      </TrayContent>
    </Tray>
  )
}
