import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { toast } from "sonner"

import {
  TrickForm,
  type TrickFormDefaultValues,
} from "~/components/forms/trick"
import { PageHeader } from "~/components/page-header"
import { tricks } from "~/lib/tricks"
import { users } from "~/lib/users"

export const Route = createFileRoute("/_authed/admin/tricks/$trickId/edit")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        tricks.get.queryOptions({ id: Number(params.trickId) }),
      ),
      context.queryClient.ensureQueryData(tricks.elements.list.queryOptions()),
      context.queryClient.ensureQueryData(
        tricks.search.queryOptions({ excludeIds: [Number(params.trickId)] }),
      ),
      context.queryClient.ensureQueryData(users.all.queryOptions()),
    ])
  },
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()
  const qc = useQueryClient()
  const { trickId } = Route.useParams()
  const id = Number(trickId)

  const { data: trick } = useSuspenseQuery(tricks.get.queryOptions({ id }))

  const updateTrick = useMutation({
    mutationFn: tricks.update.fn,
    onSuccess: () => {
      toast.success("trick updated")
      qc.removeQueries({ queryKey: tricks.graph.queryOptions().queryKey })
      qc.removeQueries({
        queryKey: tricks.get.queryOptions({ id }).queryKey,
      })
      if (trick) {
        qc.removeQueries({
          queryKey: tricks.videos.list.queryOptions({ trickId: trick.id })
            .queryKey,
        })
      }
      router.navigate({ to: "/tricks" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  if (!trick) {
    return (
      <div className="p-6">
        <p>trick not found</p>
      </div>
    )
  }

  // Transform trick data to form values
  const defaultValues: TrickFormDefaultValues = {
    name: trick.name,
    alternateNames: trick.alternateNames ?? [],
    description: trick.description,
    inventedBy: trick.inventedBy,
    inventedByUserId: trick.inventedByUserId,
    yearLanded: trick.yearLanded,
    muxAssetIds: [],
    notes: trick.notes,
    prerequisites: trick.outgoingRelationships
      .filter((r) => r.type === "prerequisite")
      .map((r) => ({
        targetTrickId: r.targetTrick.id,
        targetTrickName: r.targetTrick.name,
        type: "prerequisite" as const,
      })),
    relatedTricks: trick.outgoingRelationships
      .filter((r) => r.type === "related")
      .map((r) => ({
        targetTrickId: r.targetTrick.id,
        targetTrickName: r.targetTrick.name,
        type: "related" as const,
      })),
    elements: trick.elementAssignments.map((a) => ({
      id: a.element.id,
      name: a.element.name,
    })),
  }

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tricks">tricks</PageHeader.Crumb>
          <PageHeader.Crumb>{trickId}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-3xl space-y-6 p-4">
        <TrickForm
          defaultValues={defaultValues}
          onSubmit={(data) =>
            updateTrick.mutate({ data: { ...data, id: trick.id } })
          }
          onCancel={() => router.navigate({ to: "/tricks" })}
          submitLabel="save"
          isPending={updateTrick.isPending}
          excludeTrickId={trick.id}
        />
      </div>
    </>
  )
}
