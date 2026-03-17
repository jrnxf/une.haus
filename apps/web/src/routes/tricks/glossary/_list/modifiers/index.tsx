import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { EllipsisVerticalIcon, PencilIcon } from "lucide-react"

import { RichText } from "~/components/rich-text"
import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { useSessionUser } from "~/lib/session/hooks"
import { tricks } from "~/lib/tricks"

export const Route = createFileRoute("/tricks/glossary/_list/modifiers/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      tricks.modifiers.list.queryOptions(),
    )
  },
  component: GlossaryModifiersPage,
})

function GlossaryModifiersPage() {
  const user = useSessionUser()
  const { data: modifiers } = useSuspenseQuery(
    tricks.modifiers.list.queryOptions(),
  )

  return (
    <div className="flex flex-col gap-4">
      {modifiers.map((modifier) => (
        <div
          key={modifier.id}
          className="flex items-start justify-between gap-4 rounded-lg border p-4"
        >
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{modifier.name}</span>
            {modifier.description && (
              <RichText
                content={modifier.description}
                className="text-muted-foreground text-sm"
              />
            )}
          </div>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" aria-label="actions">
                  <EllipsisVerticalIcon className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link
                    to="/tricks/glossary/modifiers/$modifierId/suggest"
                    params={{ modifierId: modifier.id }}
                  >
                    <PencilIcon />
                    suggest edit
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ))}
    </div>
  )
}
