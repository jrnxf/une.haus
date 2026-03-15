import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { toast } from "sonner"

import { PageHeader } from "~/components/page-header"
import { VideoSubmitForm } from "~/components/tricks/video-submit-form"
import { tricks } from "~/lib/tricks"

export const Route = createFileRoute("/_authed/tricks/$trickId/submit-video")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      tricks.get.queryOptions({ id: Number(params.trickId) }),
    )
  },
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()
  const { trickId } = Route.useParams()
  const id = Number(trickId)

  const { data: trick } = useSuspenseQuery(tricks.get.queryOptions({ id }))

  const submitVideo = useMutation({
    mutationFn: tricks.videos.submit.fn,
    onSuccess: () => {
      toast.success("video submitted for review")
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

  const handleSubmit = (data: { muxAssetId: string; notes?: string }) => {
    submitVideo.mutate({
      data: {
        trickId: trick.id,
        muxAssetId: data.muxAssetId,
        notes: data.notes ?? null,
      },
    })
  }

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tricks">tricks</PageHeader.Crumb>
          <PageHeader.Crumb>{trick.name}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4">
        <p className="text-muted-foreground text-sm">
          Your video will be reviewed before appearing on the trick page
        </p>

        <VideoSubmitForm
          trickName={trick.name}
          onSubmit={handleSubmit}
          onCancel={() => router.navigate({ to: "/tricks" })}
          isPending={submitVideo.isPending}
        />
      </div>
    </>
  )
}
