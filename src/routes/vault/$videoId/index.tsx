import { useSuspenseQueries } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks";
import { ArrowLeftIcon, HeartIcon, TrendingUpIcon } from "lucide-react";

import { z } from "zod";

import { UsersDialog } from "~/components/likes-dialog";
import { ShareButton } from "~/components/share-button";
import { Button } from "~/components/ui/button";
import { VideoPlayer } from "~/components/video-player";
import { flashMessage } from "~/lib/flash";
import { invariant } from "~/lib/invariant";
import { messages } from "~/lib/messages";
import { useCreateMessage } from "~/lib/messages/hooks";
import { useSessionUser } from "~/lib/session/hooks";
import { cn } from "~/lib/utils";
import { utv } from "~/lib/utv/core";
import { MessagesView } from "~/views/messages";

const pathParametersSchema = z.object({
  videoId: z.coerce.number(),
});

export const Route = createFileRoute("/vault/$videoId/")({
  component: RouteComponent,
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { videoId }, preload }) => {
    const ensureVideo = async () => {
      try {
        await context.queryClient.ensureQueryData(
          utv.get.queryOptions(videoId),
        );
      } catch {
        // Only show flash message on actual navigation, not preload
        if (!preload) {
          await flashMessage("Video not found");
        }
        throw redirect({ to: "/vault" });
      }
    };

    const ensureMessages = async () => {
      await context.queryClient.ensureQueryData(
        messages.list.queryOptions({
          id: videoId,
          type: "utvVideo",
        }),
      );
    };

    await Promise.all([ensureVideo(), ensureMessages()]);
  },
});

function RouteComponent() {
  const { videoId } = Route.useParams();

  const [{ data: video }, { data: messagesData }] = useSuspenseQueries({
    queries: [
      utv.get.queryOptions(videoId),
      messages.list.queryOptions({
        id: videoId,
        type: "utvVideo",
      }),
    ],
  });

  invariant(video, "Video not found");

  const sessionUser = useSessionUser();

  const { mutate: createMessage } = useCreateMessage({
    id: videoId,
    type: "utvVideo",
  });

  const authUserLiked = Boolean(
    sessionUser && video.likes.some((like) => like.user.id === sessionUser.id),
  );

  const { mutate: likeUnlikeVideo } = useLikeUnlikeRecord({
    authUserLiked,
    record: { id: videoId, type: "utvVideo" },
    optimisticUpdateQueryKey: utv.get.queryOptions(videoId).queryKey,
  });

  const displayTitle = video.title || video.legacyTitle;

  return (
    <div className="h-full overflow-y-auto" id="main-content">
      <div className="mx-auto flex h-auto w-full max-w-4xl flex-col justify-start gap-6 p-4">
        <Button variant="ghost" size="sm" asChild className="-ml-3 self-start">
          <Link to="/vault">
            <ArrowLeftIcon className="size-4" />
            Back to vault
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <h1 className="flex-1 text-2xl leading-none font-semibold tracking-tight">
            {displayTitle}
          </h1>
          <div className="flex shrink-0 items-center gap-1">
            <Button size="icon-sm" variant="outline" onClick={likeUnlikeVideo}>
              <HeartIcon
                className={cn(
                  "size-4",
                  authUserLiked && "fill-red-700/50 stroke-red-700",
                )}
              />
            </Button>
            <UsersDialog
              users={video.likes.map((like) => like.user)}
              title={`${video.likes.length} ${video.likes.length === 1 ? "Like" : "Likes"}`}
              trigger={
                <Button size="icon-sm" variant="outline">
                  <TrendingUpIcon className="size-4" />
                </Button>
              }
            />
            <ShareButton />
          </div>
        </div>

        {video.video?.playbackId && (
          <VideoPlayer playbackId={video.video.playbackId} />
        )}

        <div className="shrink-0">
          <MessagesView
            record={{ id: videoId, type: "utvVideo" }}
            messages={messagesData.messages}
            handleCreateMessage={createMessage}
            scrollTargetId="main-content"
          />
        </div>
      </div>
    </div>
  );
}
