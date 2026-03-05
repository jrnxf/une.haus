import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { PencilIcon } from "lucide-react"

import { RichText } from "~/components/rich-text"
import { Button } from "~/components/ui/button"
import { useSessionUser } from "~/lib/session/hooks"
import { tricks } from "~/lib/tricks"

export const Route = createFileRoute("/tricks/glossary/_list/elements/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      tricks.elements.list.queryOptions(),
    )
  },
  component: GlossaryElementsPage,
})

function GlossaryElementsPage() {
  const user = useSessionUser()
  const { data: elements } = useSuspenseQuery(
    tricks.elements.list.queryOptions(),
  )

  return (
    <div className="flex flex-col gap-4">
      {elements.map((element) => (
        <div
          key={element.id}
          className="flex items-start justify-between gap-4 rounded-lg border p-4"
        >
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{element.name}</span>
            {element.description && (
              <RichText
                content={element.description}
                className="text-muted-foreground text-sm"
              />
            )}
          </div>
          {user && (
            <Button variant="ghost" size="icon-xs" asChild>
              <Link
                to="/tricks/glossary/elements/$elementId/suggest"
                params={{ elementId: element.id }}
                aria-label={`suggest edit for ${element.name}`}
              >
                <PencilIcon className="size-3.5" />
              </Link>
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
