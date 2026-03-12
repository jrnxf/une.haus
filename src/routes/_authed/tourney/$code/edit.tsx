import { useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router"
import { useState } from "react"

import { PageHeader } from "~/components/page-header"
import { Button } from "~/components/ui/button"
import { Field, FieldLabel } from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { tourney } from "~/lib/tourney"
import { useUpdateTournament } from "~/lib/tourney/hooks"

export const Route = createFileRoute("/_authed/tourney/$code/edit")({
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const tournament = await context.queryClient.ensureQueryData(
      tourney.get.queryOptions({ code: params.code }),
    )
    if (tournament.createdByUserId !== context.user.id) {
      throw redirect({ to: "/tourney" })
    }
  },
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      tourney.get.queryOptions({ code: params.code }),
    )
  },
})

function RouteComponent() {
  const { code } = Route.useParams()
  const navigate = useNavigate()
  const { data: tournament } = useSuspenseQuery(
    tourney.get.queryOptions({ code }),
  )
  const updateMutation = useUpdateTournament(code)
  const [name, setName] = useState(tournament.name)

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tourney">tourney</PageHeader.Crumb>
          <PageHeader.Crumb>edit</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="mx-auto w-full max-w-lg p-4 md:p-6">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            updateMutation.mutate(
              { data: { code, name } },
              {
                onSuccess: () => {
                  navigate({ to: "/tourney" })
                },
              },
            )
          }}
        >
          <Field>
            <FieldLabel>name</FieldLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </Field>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" asChild>
              <Link to="/tourney">cancel</Link>
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              save
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
