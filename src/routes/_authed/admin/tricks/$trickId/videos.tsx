import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, CheckCircle, Trash2, XCircle } from "lucide-react";

import { toast } from "sonner";

import { PageHeader } from "~/components/page-header";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { VideoPlayer } from "~/components/video-player";
import { tricks } from "~/lib/tricks";

const MAX_ACTIVE_VIDEOS = 5;

export const Route = createFileRoute("/_authed/admin/tricks/$trickId/videos")({
  loader: async ({ context, params }) => {
    const trickId = Number(params.trickId);
    await Promise.all([
      context.queryClient.ensureQueryData(
        tricks.getById.queryOptions({ id: trickId }),
      ),
      context.queryClient.ensureQueryData(
        tricks.videos.list.queryOptions({ trickId }),
      ),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const qc = useQueryClient();
  const { trickId } = Route.useParams();
  const numericTrickId = Number(trickId);

  const { data: trick } = useSuspenseQuery(
    tricks.getById.queryOptions({ id: numericTrickId }),
  );

  const { data: allVideos } = useSuspenseQuery(
    tricks.videos.list.queryOptions({ trickId: numericTrickId }),
  );

  const videosQueryKey = tricks.videos.list.queryOptions({
    trickId: numericTrickId,
  }).queryKey;
  const graphQueryKey = tricks.graph.queryOptions().queryKey;

  const activeVideos = allVideos.filter((v) => v.status === "active");
  const pendingVideos = allVideos.filter((v) => v.status === "pending");
  const rejectedVideos = allVideos.filter((v) => v.status === "rejected");

  const isAtLimit = activeVideos.length >= MAX_ACTIVE_VIDEOS;

  const reviewVideo = useMutation({
    mutationFn: tricks.videos.review.fn,
    onSuccess: (_, variables) => {
      qc.removeQueries({ queryKey: graphQueryKey });
      qc.invalidateQueries({ queryKey: videosQueryKey });
      toast.success(
        variables.data.status === "active"
          ? "Video approved"
          : "Video rejected",
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const demoteVideo = useMutation({
    mutationFn: tricks.videos.demote.fn,
    onSuccess: () => {
      qc.removeQueries({ queryKey: graphQueryKey });
      qc.invalidateQueries({ queryKey: videosQueryKey });
      toast.success("Video demoted to pending");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteVideo = useMutation({
    mutationFn: tricks.videos.delete.fn,
    onSuccess: () => {
      qc.removeQueries({ queryKey: graphQueryKey });
      qc.invalidateQueries({ queryKey: videosQueryKey });
      toast.success("Video deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const reorderVideos = useMutation({
    mutationFn: tricks.videos.reorder.fn,
    onSuccess: () => {
      qc.removeQueries({ queryKey: graphQueryKey });
      qc.invalidateQueries({ queryKey: videosQueryKey });
      toast.success("Videos reordered");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const moveVideo = (videoId: number, direction: "up" | "down") => {
    const currentIndex = activeVideos.findIndex((v) => v.id === videoId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= activeVideos.length) return;

    const newOrder = [...activeVideos];
    [newOrder[currentIndex], newOrder[newIndex]] = [
      newOrder[newIndex],
      newOrder[currentIndex],
    ];

    reorderVideos.mutate({
      data: {
        trickId: numericTrickId,
        videoIds: newOrder.map((v) => v.id),
      },
    });
  };

  if (!trick) {
    return (
      <div className="p-6">
        <p>Trick not found</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tricks">tricks</PageHeader.Crumb>
          <PageHeader.Crumb>videos: {trick.name}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-6">
        <p className="text-muted-foreground text-sm">
          {activeVideos.length}/{MAX_ACTIVE_VIDEOS} active videos
        </p>

      {/* Active Videos */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Active Videos
          <Badge variant="secondary" className="ml-2">
            {activeVideos.length}
          </Badge>
        </h2>

        {isAtLimit && (
          <Alert>
            <AlertDescription>
              This trick has the maximum of {MAX_ACTIVE_VIDEOS} active videos.
              Demote one to add more.
            </AlertDescription>
          </Alert>
        )}

        {activeVideos.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No active videos</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeVideos.map((video, index) => (
              <Card key={video.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Video {index + 1}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => moveVideo(video.id, "up")}
                        disabled={index === 0 || reorderVideos.isPending}
                      >
                        <ArrowUp className="size-3" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => moveVideo(video.id, "down")}
                        disabled={
                          index === activeVideos.length - 1 ||
                          reorderVideos.isPending
                        }
                      >
                        <ArrowDown className="size-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {video.video?.playbackId && (
                    <VideoPlayer playbackId={video.video.playbackId} />
                  )}
                  {video.notes && (
                    <p className="text-muted-foreground text-sm">
                      {video.notes}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        demoteVideo.mutate({ data: { id: video.id } })
                      }
                      disabled={demoteVideo.isPending}
                    >
                      <XCircle className="size-4" />
                      Demote
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        deleteVideo.mutate({ data: { id: video.id } })
                      }
                      disabled={deleteVideo.isPending}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Pending Videos */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Pending Videos
          <Badge variant="secondary" className="ml-2">
            {pendingVideos.length}
          </Badge>
        </h2>

        {pendingVideos.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No pending videos</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingVideos.map((video) => (
              <Card key={video.id}>
                <CardHeader className="pb-2">
                  <p className="text-muted-foreground text-xs">
                    Submitted by {video.submittedBy.name}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {video.video?.playbackId && (
                    <VideoPlayer playbackId={video.video.playbackId} />
                  )}
                  {video.notes && (
                    <p className="text-muted-foreground text-sm">
                      {video.notes}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        reviewVideo.mutate({
                          data: { id: video.id, status: "active" },
                        })
                      }
                      disabled={reviewVideo.isPending || isAtLimit}
                      title={
                        isAtLimit
                          ? "Demote an active video first"
                          : "Approve video"
                      }
                    >
                      <CheckCircle className="size-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        reviewVideo.mutate({
                          data: { id: video.id, status: "rejected" },
                        })
                      }
                      disabled={reviewVideo.isPending}
                    >
                      <XCircle className="size-4" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        deleteVideo.mutate({ data: { id: video.id } })
                      }
                      disabled={deleteVideo.isPending}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Rejected Videos */}
      {rejectedVideos.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            Rejected Videos
            <Badge variant="secondary" className="ml-2">
              {rejectedVideos.length}
            </Badge>
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            {rejectedVideos.map((video) => (
              <Card key={video.id} className="opacity-60">
                <CardHeader className="pb-2">
                  <p className="text-muted-foreground text-xs">
                    Submitted by {video.submittedBy.name}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {video.video?.playbackId && (
                    <VideoPlayer playbackId={video.video.playbackId} />
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-full"
                    onClick={() =>
                      deleteVideo.mutate({ data: { id: video.id } })
                    }
                    disabled={deleteVideo.isPending}
                  >
                    <Trash2 className="size-4" />
                    Delete Permanently
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
      </div>
    </>
  );
}
