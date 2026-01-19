import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { z } from "zod";

import { toast } from "sonner";

import { SubmissionCard } from "~/components/tricks/submission-card";
import { SuggestionCard } from "~/components/tricks/suggestion-card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { VideoPlayer } from "~/components/video-player";
import { session } from "~/lib/session";
import { tricks, type PendingVideosData } from "~/lib/tricks";

const searchSchema = z.object({
  submissionId: z.number().optional(),
  suggestionId: z.number().optional(),
  tab: z.enum(["submissions", "suggestions", "videos"]).optional(),
});

export const Route = createFileRoute("/_authed/tricks/review")({
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    const sessionData = await context.queryClient.ensureQueryData(
      session.get.queryOptions(),
    );
    const isAdmin = sessionData.user?.id === 1;
    await Promise.all([
      context.queryClient.ensureQueryData(
        tricks.submissions.list.queryOptions({ status: "pending" }),
      ),
      context.queryClient.ensureQueryData(
        tricks.suggestions.list.queryOptions({ status: "pending" }),
      ),
      // Only load pending videos for admin
      isAdmin
        ? context.queryClient.ensureQueryData(
            tricks.videos.listPending.queryOptions(),
          )
        : Promise.resolve([]),
    ]);
    return { isAdmin };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const search = useSearch({ from: "/_authed/tricks/review" });
  const { isAdmin } = Route.useLoaderData();

  const { data: submissions } = useSuspenseQuery(
    tricks.submissions.list.queryOptions({ status: "pending" }),
  );

  const { data: suggestions } = useSuspenseQuery(
    tricks.suggestions.list.queryOptions({ status: "pending" }),
  );

  const defaultTab = search.tab ?? "submissions";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/tricks">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Review Tricks</h1>
          <p className="text-muted-foreground text-sm">
            Community submissions and suggested edits
          </p>
        </div>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="submissions">
            Submissions
            {submissions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {submissions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="suggestions">
            Suggestions
            {suggestions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {suggestions.length}
              </Badge>
            )}
          </TabsTrigger>
          {isAdmin && <AdminVideosTabTrigger />}
        </TabsList>

        <TabsContent value="submissions" className="mt-6">
          {submissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  No pending submissions
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {submissions.map((submission) => (
                <div key={submission.id}>
                  <SubmissionCard submission={submission} showStatus={false} />
                  {isAdmin && (
                    <ReviewActions type="submission" id={submission.id} />
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="suggestions" className="mt-6">
          {suggestions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  No pending suggestions
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id}>
                  <SuggestionCard suggestion={suggestion} showStatus={false} />
                  {isAdmin && (
                    <ReviewActions type="suggestion" id={suggestion.id} />
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {isAdmin && <AdminVideosTabContent />}
      </Tabs>
    </div>
  );
}

// Extracted to separate components to avoid conditional hook calls
function AdminVideosTabTrigger() {
  const { data: pendingVideos } = useSuspenseQuery(
    tricks.videos.listPending.queryOptions(),
  );

  return (
    <TabsTrigger value="videos">
      Videos
      {pendingVideos.length > 0 && (
        <Badge variant="secondary" className="ml-2">
          {pendingVideos.length}
        </Badge>
      )}
    </TabsTrigger>
  );
}

function AdminVideosTabContent() {
  const { data: pendingVideos } = useSuspenseQuery(
    tricks.videos.listPending.queryOptions(),
  );

  return (
    <TabsContent value="videos" className="mt-6">
      {pendingVideos.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No pending videos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pendingVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </TabsContent>
  );
}

function VideoCard({ video }: { video: PendingVideosData[number] }) {
  const qc = useQueryClient();

  const pendingVideosQueryKey = tricks.videos.listPending.queryOptions().queryKey;
  const graphQueryKey = tricks.graph.queryOptions().queryKey;

  const reviewVideo = useMutation({
    mutationFn: tricks.videos.review.fn,
    onMutate: async ({ data: { id: videoId } }) => {
      await qc.cancelQueries({ queryKey: pendingVideosQueryKey });
      const prev = qc.getQueryData(pendingVideosQueryKey);
      qc.setQueryData(pendingVideosQueryKey, (old: typeof prev) =>
        old?.filter((item) => item.id !== videoId),
      );
      return { prev };
    },
    onSuccess: (_, variables) => {
      qc.removeQueries({ queryKey: graphQueryKey });
      toast.success(
        variables.data.status === "active"
          ? "Video approved"
          : "Video rejected",
      );
    },
    onError: (error, _, context) => {
      if (context?.prev) {
        qc.setQueryData(pendingVideosQueryKey, context.prev);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: pendingVideosQueryKey });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {video.trick.name}
        </CardTitle>
        <p className="text-muted-foreground text-xs">
          Submitted by {video.submittedBy.name}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {video.video?.playbackId && (
          <VideoPlayer playbackId={video.video.playbackId} />
        )}
        {video.notes && (
          <p className="text-muted-foreground text-sm">{video.notes}</p>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() =>
              reviewVideo.mutate({ data: { id: video.id, status: "active" } })
            }
            disabled={reviewVideo.isPending}
          >
            <CheckCircle className="size-4" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() =>
              reviewVideo.mutate({ data: { id: video.id, status: "rejected" } })
            }
            disabled={reviewVideo.isPending}
          >
            <XCircle className="size-4" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewActions({
  type,
  id,
}: {
  type: "submission" | "suggestion";
  id: number;
}) {
  const qc = useQueryClient();

  const submissionsQueryKey = tricks.submissions.list.queryOptions({ status: "pending" }).queryKey;
  const suggestionsQueryKey = tricks.suggestions.list.queryOptions({ status: "pending" }).queryKey;
  const graphQueryKey = tricks.graph.queryOptions().queryKey;

  const reviewSubmission = useMutation({
    mutationFn: tricks.submissions.review.fn,
    onMutate: async ({ data: { id: submissionId } }) => {
      // Cancel in-flight queries
      await qc.cancelQueries({ queryKey: submissionsQueryKey });

      // Get previous data for rollback
      const prev = qc.getQueryData(submissionsQueryKey);

      // Optimistically remove from list
      qc.setQueryData(submissionsQueryKey, (old: typeof prev) =>
        old?.filter((item) => item.id !== submissionId),
      );

      return { prev };
    },
    onSuccess: (_, variables) => {
      // Remove graph query so it fetches fresh data when navigated to
      qc.removeQueries({ queryKey: graphQueryKey });
      toast.success(
        variables.data.status === "approved"
          ? "Submission approved"
          : "Submission rejected",
      );
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.prev) {
        qc.setQueryData(submissionsQueryKey, context.prev);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: submissionsQueryKey });
    },
  });

  const reviewSuggestion = useMutation({
    mutationFn: tricks.suggestions.review.fn,
    onMutate: async ({ data: { id: suggestionId } }) => {
      // Cancel in-flight queries
      await qc.cancelQueries({ queryKey: suggestionsQueryKey });

      // Get previous data for rollback
      const prev = qc.getQueryData(suggestionsQueryKey);

      // Optimistically remove from list
      qc.setQueryData(suggestionsQueryKey, (old: typeof prev) =>
        old?.filter((item) => item.id !== suggestionId),
      );

      return { prev };
    },
    onSuccess: (_, variables) => {
      // Remove graph query so it fetches fresh data when navigated to
      qc.removeQueries({ queryKey: graphQueryKey });
      toast.success(
        variables.data.status === "approved"
          ? "Suggestion approved"
          : "Suggestion rejected",
      );
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.prev) {
        qc.setQueryData(suggestionsQueryKey, context.prev);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: suggestionsQueryKey });
    },
  });

  const isPending =
    type === "submission"
      ? reviewSubmission.isPending
      : reviewSuggestion.isPending;

  const handleApprove = () => {
    if (type === "submission") {
      reviewSubmission.mutate({ data: { id, status: "approved" } });
    } else {
      reviewSuggestion.mutate({ data: { id, status: "approved" } });
    }
  };

  const handleReject = () => {
    if (type === "submission") {
      reviewSubmission.mutate({ data: { id, status: "rejected" } });
    } else {
      reviewSuggestion.mutate({ data: { id, status: "rejected" } });
    }
  };

  return (
    <div className="mt-2 flex gap-2">
      <Button
        size="sm"
        variant="outline"
        className="flex-1"
        onClick={handleApprove}
        disabled={isPending}
      >
        <CheckCircle className="size-4" />
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="flex-1"
        onClick={handleReject}
        disabled={isPending}
      >
        <XCircle className="size-4" />
        Reject
      </Button>
    </div>
  );
}
