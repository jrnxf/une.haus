import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { VideoSubmitForm } from "~/components/tricks/video-submit-form";
import { Button } from "~/components/ui/button";
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
    onSuccess: async () => {
      toast.success("Video submitted for review");
      // Remove stale cache and prefetch fresh data before navigating
      qc.removeQueries({
        queryKey: tricks.videos.listPending.queryOptions().queryKey,
      });
      await Promise.all([
        qc.prefetchQuery(tricks.videos.listPending.queryOptions()),
        qc.prefetchQuery(tricks.submissions.list.queryOptions({ status: "pending" })),
        qc.prefetchQuery(tricks.suggestions.list.queryOptions({ status: "pending" })),
      ]);
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
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/tricks">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Submit Video: {trick.name}</h1>
          <p className="text-muted-foreground text-sm">
            Your video will be reviewed before appearing on the trick page
          </p>
        </div>
      </div>

      <VideoSubmitForm
        trickName={trick.name}
        onSubmit={handleSubmit}
        onCancel={() => router.navigate({ to: "/tricks" })}
        isPending={submitVideo.isPending}
      />
    </div>
  );
}
