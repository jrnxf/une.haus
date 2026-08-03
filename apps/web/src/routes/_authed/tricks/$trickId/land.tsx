import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"

import { PageHeader } from "~/components/page-header"
import { VideoSubmitForm } from "~/components/tricks/video-submit-form"
import { Checkbox } from "~/components/ui/checkbox"
import { Field, FieldLabel } from "~/components/ui/field"
import { useSessionUser } from "~/lib/session/hooks"
import { tricks } from "~/lib/tricks"

export const Route = createFileRoute("/_authed/tricks/$trickId/land")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      tricks.get.queryOptions({ id: Number(params.trickId) }),
    )
  },
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()
  const qc = useQueryClient()
  const sessionUser = useSessionUser()
  const { trickId } = Route.useParams()
  const id = Number(trickId)

  const { data: trick } = useSuspenseQuery(tricks.get.queryOptions({ id }))

  const [attested, setAttested] = useState(false)

  const land = useMutation({
    mutationFn: tricks.landings.land.fn,
    onSuccess: () => {
      toast.success("landing submitted")
      qc.removeQueries({
        queryKey: tricks.landings.mine.queryOptions().queryKey,
      })
      qc.removeQueries({
        queryKey: tricks.landings.counts.queryOptions().queryKey,
      })
      if (sessionUser) {
        qc.removeQueries({
          queryKey: tricks.landings.forUser.queryOptions({
            userId: sessionUser.id,
          }).queryKey,
        })
      }
      router.navigate({ to: "/tricks/$trickId", params: { trickId } })
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

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tricks">tricks</PageHeader.Crumb>
          <PageHeader.Crumb to={`/tricks/${trickId}`}>
            {trick.name}
          </PageHeader.Crumb>
          <PageHeader.Crumb>land</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-3xl space-y-6 p-4">
        <p className="text-muted-foreground text-sm">
          prove it. your video counts as a landing right away and will be
          reviewed before appearing on the trick page.
        </p>

        <VideoSubmitForm
          trickName={trick.name}
          onSubmit={(data) => {
            land.mutate({
              data: {
                trickId: trick.id,
                muxAssetId: data.muxAssetId,
                notes: data.notes ?? null,
                confirmedSingleTrick: true,
              },
            })
          }}
          onCancel={() =>
            router.navigate({ to: "/tricks/$trickId", params: { trickId } })
          }
          isPending={land.isPending}
          submitDisabled={!attested}
          attestation={
            <Field orientation="horizontal" className="items-start gap-2">
              <Checkbox
                id="confirmed-single-trick"
                checked={attested}
                onCheckedChange={(checked) => setAttested(checked === true)}
              />
              <FieldLabel
                htmlFor="confirmed-single-trick"
                className="font-normal"
              >
                this video contains only{" "}
                <span className="font-medium">{trick.name}</span> — sets with
                multiple tricks will be rejected
              </FieldLabel>
            </Field>
          }
        />
      </div>
    </>
  )
}
