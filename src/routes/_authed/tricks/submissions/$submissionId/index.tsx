import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle,
  Heart,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { z } from "zod";

import { toast } from "sonner";

import { UsersDialog } from "~/components/likes-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { flashMessage } from "~/lib/flash";
import { invariant } from "~/lib/invariant";
import { messages } from "~/lib/messages";
import { useCreateMessage } from "~/lib/messages/hooks";
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks";
import { session } from "~/lib/session";
import { useSessionUser } from "~/lib/session/hooks";
import { tricks } from "~/lib/tricks";
import { cn } from "~/lib/utils";
import { MessagesView } from "~/views/messages";

const pathParametersSchema = z.object({
  submissionId: z.coerce.number(),
});

export const Route = createFileRoute(
  "/_authed/tricks/submissions/$submissionId/",
)({
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { submissionId } }) => {
    try {
      const [sessionData] = await Promise.all([
        context.queryClient.ensureQueryData(session.get.queryOptions()),
        context.queryClient.ensureQueryData(
          tricks.submissions.get.queryOptions({ id: submissionId }),
        ),
        context.queryClient.ensureQueryData(
          messages.list.queryOptions({
            type: "trickSubmission",
            id: submissionId,
          }),
        ),
      ]);
      return { isAdmin: sessionData.user?.id === 1 };
    } catch {
      await flashMessage("Submission not found");
      throw redirect({ to: "/tricks/review" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { submissionId } = Route.useParams();
  const { isAdmin } = Route.useLoaderData();

  return (
    <div className="mx-auto flex w-full max-w-4xl grow overflow-hidden overflow-y-auto px-2 py-4">
      <div
        className="flex w-full max-w-4xl grow flex-col gap-6 overflow-y-auto px-4"
        id="main-content"
      >
        <SubmissionView submissionId={submissionId} isAdmin={isAdmin} />
      </div>
    </div>
  );
}

function SubmissionView({
  submissionId,
  isAdmin,
}: {
  submissionId: number;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: submission } = useSuspenseQuery(
    tricks.submissions.get.queryOptions({ id: submissionId }),
  );

  invariant(submission, "Submission not found");

  const record = { type: "trickSubmission" as const, id: submissionId };
  const messagesQuery = useSuspenseQuery(messages.list.queryOptions(record));
  const createMessage = useCreateMessage(record);

  const sessionUser = useSessionUser();

  const authUserLiked = submission.likes.some(
    (like) => like.userId === sessionUser?.id,
  );

  const likeUnlike = useLikeUnlikeRecord({
    record,
    authUserLiked,
    optimisticUpdateQueryKey: tricks.submissions.get.queryOptions({
      id: submissionId,
    }).queryKey,
  });

  const submissionsQueryKey = tricks.submissions.list.queryOptions({ status: "pending" }).queryKey;
  const graphQueryKey = tricks.graph.queryOptions().queryKey;

  const reviewSubmission = useMutation({
    mutationFn: tricks.submissions.review.fn,
    onMutate: () => {
      qc.cancelQueries({ queryKey: submissionsQueryKey });
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.data.status === "approved"
          ? "Submission approved - trick created!"
          : "Submission rejected",
      );
      // Remove queries so loader fetches fresh data on navigation
      qc.removeQueries({ queryKey: submissionsQueryKey });
      qc.removeQueries({ queryKey: graphQueryKey });
      router.navigate({ to: "/tricks/review" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isPending = submission.status === "pending";

  return (
    <>
      <Link
        to="/tricks/review"
        className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        <span>Back to Review</span>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl">{submission.name}</CardTitle>
              <CardDescription>{submission.slug}</CardDescription>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "shrink-0 gap-1 border-0",
                submission.status === "pending" &&
                  "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
                submission.status === "approved" &&
                  "bg-green-500/20 text-green-700 dark:text-green-300",
                submission.status === "rejected" &&
                  "bg-red-500/20 text-red-700 dark:text-red-300",
              )}
            >
              {submission.status === "pending" && "Pending"}
              {submission.status === "approved" && "Approved"}
              {submission.status === "rejected" && "Rejected"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Definition */}
          {submission.definition && (
            <p className="text-sm">{submission.definition}</p>
          )}

          {/* Metadata Grid */}
          <div className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
            {submission.alternateNames && submission.alternateNames.length > 0 && (
              <div className="col-span-2 sm:col-span-3">
                <span className="font-medium">Aliases: </span>
                {submission.alternateNames.join(", ")}
              </div>
            )}
            {submission.inventedBy && (
              <div>
                <span className="font-medium">Invented by: </span>
                {submission.inventedBy}
              </div>
            )}
            {submission.yearLanded && (
              <div>
                <span className="font-medium">Year: </span>
                {submission.yearLanded}
              </div>
            )}
            {submission.isPrefix && (
              <div>
                <Badge variant="outline" className="text-[10px]">
                  Prefix Trick
                </Badge>
              </div>
            )}
            {submission.videoUrl && (
              <div className="col-span-2 sm:col-span-3">
                <span className="font-medium">Video: </span>
                <a
                  href={submission.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {submission.videoUrl}
                  {submission.videoTimestamp && ` @ ${submission.videoTimestamp}`}
                </a>
              </div>
            )}
          </div>

          {/* Notes */}
          {submission.notes && (
            <p className="text-muted-foreground text-xs italic">
              {submission.notes}
            </p>
          )}

          {/* Relationships */}
          {submission.relationships.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {submission.relationships.map((rel) => (
                <Badge
                  key={`${rel.type}-${rel.targetTrick.id}`}
                  variant="outline"
                  className="text-[10px]"
                >
                  {rel.type === "prerequisite" && "Prereq: "}
                  {rel.type === "optional_prerequisite" && "Opt: "}
                  {rel.type === "related" && "Rel: "}
                  {rel.targetTrick.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-2">
              <Avatar
                className="size-6"
                cloudflareId={submission.submittedBy.avatarId}
                alt={submission.submittedBy.name}
              >
                <AvatarImage width={24} quality={85} />
                <AvatarFallback
                  className="text-xs"
                  name={submission.submittedBy.name}
                />
              </Avatar>
              <span className="text-muted-foreground text-sm">
                Submitted by {submission.submittedBy.name}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="icon-sm"
                variant="outline"
                onClick={likeUnlike.mutate}
              >
                <Heart
                  className={cn(
                    "size-4",
                    authUserLiked && "fill-red-700/50 stroke-red-700",
                  )}
                />
              </Button>
              {submission.likes.length > 0 && (
                <UsersDialog
                  users={submission.likes.map((l) => l.user)}
                  title={`${submission.likes.length} Likes`}
                  trigger={
                    <Button size="icon-sm" variant="outline">
                      <TrendingUp className="size-4" />
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isAdmin && isPending && (
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() =>
              reviewSubmission.mutate({
                data: { id: submissionId, status: "approved" },
              })
            }
            disabled={reviewSubmission.isPending}
          >
            <CheckCircle className="mr-2 size-4" />
            Approve
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() =>
              reviewSubmission.mutate({
                data: { id: submissionId, status: "rejected" },
              })
            }
            disabled={reviewSubmission.isPending}
          >
            <XCircle className="mr-2 size-4" />
            Reject
          </Button>
        </div>
      )}

      <MessagesView
        record={record}
        messages={messagesQuery.data.messages}
        handleCreateMessage={(content) => createMessage.mutate(content)}
        scrollTargetId="main-content"
      />
    </>
  );
}
