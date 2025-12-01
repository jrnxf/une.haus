import { Loader2Icon, TrashIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { confirm } from "~/lib/confirm-dialog";
import { useDeleteSet } from "~/lib/games/rius/hooks";

export function DeleteSetButton({ setId }: { setId: number }) {
  const deleteSet = useDeleteSet();

  return (
    <Button
      className="focus:bg-red-700 focus:text-white"
      onClick={() =>
        confirm.open({
          title: "Delete Set",
          description: "Are you sure you want to delete this set? This action cannot be undone.",
          confirmText: "Delete",
          onConfirm: () => {
            deleteSet.mutate({
              data: {
                riuSetId: setId,
              },
            });
          },
        })
      }
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      {deleteSet.isPending ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <TrashIcon className="size-4" />
      )}
    </Button>
  );
}
