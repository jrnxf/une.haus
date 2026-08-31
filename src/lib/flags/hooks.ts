import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import { flagsDomain } from "~/lib/flags"

export function useFlagContent() {
  return useMutation({
    mutationFn: flagsDomain.flag.fn,
    onSuccess: () => {
      toast.success("flagged for review")
    },
    onError: (error) => {
      toast.error(error.message || "failed to flag content")
    },
  })
}
