import { Loader2Icon } from "lucide-react"

// default fallback for suspense boundaries around list/detail content
export function SuspenseLoader() {
  return (
    <div
      role="status"
      aria-label="loading"
      className="text-muted-foreground flex justify-center py-6"
    >
      <Loader2Icon className="size-5 animate-spin" />
    </div>
  )
}
