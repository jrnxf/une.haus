import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import { toast } from "sonner";

import { PageHeader } from "~/components/page-header";
import { VideoSubmitForm } from "~/components/tricks/video-submit-form";
import { tricks } from "~/lib/tricks";

export const Route = createFileRoute("/_authed/tricks/$trickId/submit-video")({
  loader: async ({ context, params }) => {
    // trickId is actually the slug in this route
    await context.queryClient.ensureQueryData(
      tricks.get.queryOptions({ slug: params.trickId }),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const qc = useQueryClient();
  const { trickId: slug } = Route.useParams();

  const { data: trick } = useSuspenseQuery(tricks.get.queryOptions({ slug }));

  const submitVideo = useMutation({
    mutationFn: tricks.videos.submit.fn,
    onSuccess: () => {
      toast.success("Video submitted for review");
      qc.removeQueries({
        queryKey: tricks.videos.listPending.queryOptions().queryKey,
      });
      router.navigate({ to: "/tricks/review", search: { tab: "videos" } });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (!trick) {
    return (
      <div className="p-6">
        <p>Trick not found</p>
      </div>
    );
  }

  const handleSubmit = (data: { muxAssetId: string; notes?: string }) => {
    submitVideo.mutate({
      data: {
        trickId: trick.id,
        muxAssetId: data.muxAssetId,
        notes: data.notes ?? null,
      },
    });
  };

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tricks">tricks</PageHeader.Crumb>
          <PageHeader.Crumb>{trick.name}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
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
  );
}
