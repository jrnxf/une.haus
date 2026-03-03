import { ShareIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "~/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"

export function ShareButton() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon-sm"
          variant="outline"
          aria-label="share"
          onClick={() => {
            navigator.clipboard.writeText(globalThis.location.href)
            toast.success("link copied")
          }}
        >
          <ShareIcon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>share</TooltipContent>
    </Tooltip>
  )
}
