import { Link } from "@tanstack/react-router"

import { badgeVariants } from "~/components/ui/badge"

// Badge link for a landed trick; pending landings carry a muted suffix
export function LandingBadge({
  trickId,
  name,
  pending,
}: {
  trickId: number
  name: string
  pending: boolean
}) {
  return (
    <Link
      to="/tricks/$trickId"
      params={{ trickId: String(trickId) }}
      className={badgeVariants({ variant: "secondary" })}
    >
      {name}
      {pending && <span className="text-muted-foreground">pending</span>}
    </Link>
  )
}
