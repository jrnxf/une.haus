import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks";
import { HeartIcon, TrashIcon, TrendingUpIcon } from "lucide-react";

import { z } from "zod";

import { confirm } from "~/components/confirm-dialog";
import { UsersDialog } from "~/components/likes-dialog";
import { ShareButton } from "~/components/share-button";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { VideoPlayer } from "~/components/video-player";
import { flashMessage } from "~/lib/flash";
import { games } from "~/lib/games";
import { useDeleteSubmission } from "~/lib/games/rius/hooks";
import { invariant } from "~/lib/invariant";
import { messages } from "~/lib/messages";
import { useCreateMessage } from "~/lib/messages/hooks";
import { useSessionUser } from "~/lib/session/hooks";
import { cn } from "~/lib/utils";
import { MessagesView } from "~/views/messages";

const pathParametersSchema = z.object({
  submissionId: z.coerce.number(),
});

export const Route = createFileRoute("/games/rius/submissions/$submissionId/")({
  component: RouteComponent,
  params: {
    parse: pathParametersSchema.parse,
  },
  staticData: {
    pageHeader: {
      breadcrumbs: [
        { label: "games", to: "/games" },
        { label: "rack it up", to: "/games/rius/active" },
        { label: "" },
      ],
      maxWidth: "4xl",
    },
  },
  loader: async ({ context, params: { submissionId }, preload }) => {
    const ensureSubmission = async () => {
      try {
        await context.queryClient.ensureQueryData(
          games.rius.submissions.get.queryOptions({ submissionId }),
        );
        await context.queryClient.ensureQueryData(
          messages.list.queryOptions({
            type: "riuSubmission",
            id: submissionId,
          }),
        );
      } catch {
        // Only show flash message on actual navigation, not preload
        if (!preload) {
          await flashMessage("Submission not found");
        }
        throw redirect({ to: "/games/rius/active" });
      }
    };

    await ensureSubmission();

    const submissionData = context.queryClient.getQueryData(
      games.rius.submissions.get.queryOptions({ submissionId }).queryKey,
    );

    return {
      pageHeader: {
        breadcrumbOverrides: {
          2: {
            label: (submissionData as { user?: { name?: string } } | undefined)
              ?.user?.name
              ? `${(submissionData as { user?: { name?: string } }).user!.name}'s submission`
              : "submission",
          },
        },
      },
    };
  },
});

function RouteComponent() {
  const { submissionId } = Route.useParams();

  return (
    <>
      <div className="h-full min-h-0 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
          <SubmissionView submissionId={submissionId} />
        </div>
      </div>
    </>
  );
}

function SubmissionView({ submissionId }: { submissionId: number }) {
  const { data: submission } = useSuspenseQuery(
    games.rius.submissions.get.queryOptions({ submissionId }),
  );

  invariant(submission, "Submission not found");

  const record = { type: "riuSubmission" as const, id: submissionId };
  const messagesQuery = useSuspenseQuery(messages.list.queryOptions(record));
  const createMessage = useCreateMessage(record);

  const sessionUser = useSessionUser();

  const authUserLiked = submission.likes.some(
    (like) => like.userId === sessionUser?.id,
  );

  const likeUnlike = useLikeUnlikeRecord({
    record,
    authUserLiked,
    optimisticUpdateQueryKey: games.rius.submissions.get.queryOptions({
      submissionId,
    }).queryKey,
  });

  const deleteSubmission = useDeleteSubmission({ setId: submission.riuSet.id });

  const isOwner = submission.user.id === sessionUser?.id;

  return (
    <>
      <div className="flex items-center gap-2">
        <h1 className="shrink-0 text-2xl leading-none font-semibold tracking-tight">
          {submission.user.name}
        </h1>

        <div className="flex shrink-0 grow items-center justify-end gap-1">
          {isOwner && (
            <>
              <Button
                onClick={() =>
                  confirm.open({
                    title: "Delete Submission",
                    description:
                      "Are you sure you want to delete this submission? This action cannot be undone.",
                    confirmText: "Delete",
                    onConfirm: () => {
                      deleteSubmission.mutate({
                        data: { submissionId: submission.id },
                      });
                    },
                  })
                }
                size="icon-sm"
                variant="outline"
              >
                <TrashIcon className="size-4" />
              </Button>
              <Separator orientation="vertical" className="mx-1 h-6" />
            </>
          )}
          {sessionUser && (
            <Button
              size="icon-sm"
              variant="outline"
              onClick={likeUnlike.mutate}
            >
              <HeartIcon
                className={cn(
                  "size-4",
                  authUserLiked && "fill-red-700/50 stroke-red-700",
                )}
              />
            </Button>
          )}
          {submission.likes.length > 0 && (
            <UsersDialog
              users={submission.likes.map((l) => l.user)}
              title={`${submission.likes.length} Likes`}
              trigger={
                <Button size="icon-sm" variant="outline">
                  <TrendingUpIcon className="size-4" />
                </Button>
              }
            />
          )}
          <ShareButton />
        </div>
      </div>

      {submission.video && submission.video.playbackId && (
        <VideoPlayer playbackId={submission.video.playbackId} />
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
