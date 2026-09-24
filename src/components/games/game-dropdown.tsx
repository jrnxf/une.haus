import { Link } from "@tanstack/react-router"
import { ChevronDownIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { cn } from "~/lib/utils"

export function GameDropdown({
  label,
  isCurrentPage,
}: {
  label: string
  isCurrentPage: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "focus-visible:ring-ring flex items-center gap-1 rounded-sm text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          isCurrentPage
            ? "text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground transition-colors",
        )}
      >
        {label}
        <ChevronDownIcon className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem render={<Link to="/games/rius">rack it up</Link>} />
        <DropdownMenuItem render={<Link to="/games/bius">back it up</Link>} />
        <DropdownMenuItem render={<Link to="/games/sius">stack it up</Link>} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
