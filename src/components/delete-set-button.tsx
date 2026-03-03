import { Loader2Icon, TrashIcon } from "lucide-react"

import { confirm } from "~/components/confirm-dialog"
import { Button } from "~/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { useDeleteSet } from "~/lib/games/rius/hooks"

export function DeleteSetButton({ setId }: { setId: number }) {
  const deleteSet = useDeleteSet()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className="focus:bg-red-700 focus:text-white"
          onClick={() =>
            confirm.open({
              title: "delete set",
              description:
                "are you sure you want to delete this set? this action cannot be undone.",
              confirmText: "delete",
              onConfirm: () => {
                deleteSet.mutate({
                  data: {
                    riuSetId: setId,
                  },
                })
              },
            })
          }
          size="icon-sm"
          type="button"
          variant="ghost"
          aria-label="delete"
        >
          {deleteSet.isPending ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <TrashIcon className="size-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>delete</TooltipContent>
    </Tooltip>
  )
}
