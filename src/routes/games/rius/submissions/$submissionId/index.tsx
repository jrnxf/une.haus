import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  HeartIcon,
  PencilIcon,
  Share2Icon,
  TrashIcon,
  TrendingUpIcon,
} from "lucide-react";

import { z } from "zod";

import { Button } from "~/components/ui/button";
import { VideoPlayer } from "~/components/video-player";
import { flashMessage } from "~/lib/flash";
import { games } from "~/lib/games";
import { invariant } from "~/lib/invariant";
import { useSessionUser } from "~/lib/session/hooks";
import { cn } from "~/lib/utils";

const pathParametersSchema = z.object({
  submissionId: z.coerce.number(),
});

export const Route = createFileRoute("/games/rius/submissions/$submissionId/")({
  component: RouteComponent,
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { submissionId } }) => {
    const ensureSet = async () => {
      try {
        await context.queryClient.ensureQueryData(
          games.rius.submissions.get.queryOptions({ submissionId }),
        );
      } catch {
        await flashMessage("Submission not found");
        throw redirect({ to: "/games/rius/active" });
      }
    };

    await ensureSet();
  },
});

function RouteComponent() {
  const { submissionId } = Route.useParams();

  return (
    <div className="mx-auto flex w-full max-w-4xl grow overflow-hidden overflow-y-auto px-2 py-4">
      <div
        className="flex w-full max-w-4xl grow overflow-hidden overflow-y-auto px-4"
        id="main-content"
      >
        <SubmissionView submissionId={submissionId} />
      </div>
    </div>
  );
}

function SubmissionView({ submissionId }: { submissionId: number }) {
  const { data: submission } = useSuspenseQuery(
    games.rius.submissions.get.queryOptions({ submissionId }),
  );

  invariant(submission, "Submission not found");

  const sessionUser = useSessionUser();

  // TODO: Add like/unlike functionality for sets if needed
  const authUserLiked = false; // Sets don't have likes yet

  const isOwner = submission.user.id === sessionUser?.id;

  return (
    <div className="mx-auto flex h-auto w-full max-w-4xl flex-col justify-start gap-6 p-3">
      <div className="flex items-center gap-3">
        <div className="w-full space-y-1">
          <div className="flex items-center gap-2 text-2xl leading-none font-semibold tracking-tight">
            #{submission.id}
          </div>
        </div>

        <div className="text-muted-foreground text-sm">
          {submission.user.name}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="icon-sm" variant="outline" disabled>
            <HeartIcon
              className={cn(
                "size-4",
                authUserLiked && "fill-red-700/50 stroke-red-700",
              )}
            />
          </Button>
          <Button size="icon-sm" variant="outline" disabled>
            <TrendingUpIcon className="size-4" />
          </Button>
          <Button size="icon-sm" variant="outline" disabled>
            <Share2Icon className="size-4" />
          </Button>
        </div>
      </div>

      {isOwner && (
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="outline" disabled>
            <PencilIcon className="size-4" />
          </Button>
          <Button
            onClick={() => {
              // TODO: Implement delete set functionality
              console.log("Delete submission", submission.id);
            }}
            size="icon-sm"
            variant="outline"
          >
            <TrashIcon className="size-4" />
          </Button>
        </div>
      )}

      {submission.video && submission.video.playbackId && (
        <VideoPlayer playbackId={submission.video.playbackId} />
      )}

      {/* Sets don't have messages yet - could be added later */}
    </div>
  );
}
