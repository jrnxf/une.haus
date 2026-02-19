import { useSuspenseQueries } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  HeartIcon,
  PencilIcon,
  ShieldIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks";

import { z } from "zod";

import { DisciplineBadge } from "~/components/badges";
import { UsersDialog } from "~/components/likes-dialog";
import { ShareButton } from "~/components/share-button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { VideoPlayer } from "~/components/video-player";
import type { UserDiscipline } from "~/db/schema";
import { flashMessage } from "~/lib/flash";
import { invariant } from "~/lib/invariant";
import { messages } from "~/lib/messages";
import { useCreateMessage } from "~/lib/messages/hooks";
import { useIsAdmin, useSessionUser } from "~/lib/session/hooks";
import { cn } from "~/lib/utils";
import { utv } from "~/lib/utv/core";
import { MessagesView } from "~/views/messages";

import { PageHeader } from "~/components/page-header";

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
  const isAdmin = useIsAdmin();

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
    <>
      <PageHeader maxWidth="max-w-4xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/vault">vault</PageHeader.Crumb>
          <PageHeader.Crumb>{displayTitle}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="h-full min-h-0 overflow-y-auto">
        <div className="mx-auto flex h-auto w-full max-w-4xl flex-col justify-start gap-6 p-4 md:p-6">
          <div className="flex items-center gap-2">
            <h1 className="flex-1 text-2xl leading-none font-semibold tracking-tight">
              {displayTitle}
            </h1>
            <div className="flex shrink-0 items-center gap-1">
              {sessionUser && (
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={likeUnlikeVideo}
                >
                  <HeartIcon
                    className={cn(
                      "size-4",
                      authUserLiked && "fill-red-700/50 stroke-red-700",
                    )}
                  />
                </Button>
              )}
              {video.likes.length > 0 && (
                <UsersDialog
                  users={video.likes.map((like) => like.user)}
                  title={`${video.likes.length} ${video.likes.length === 1 ? "Like" : "Likes"}`}
                  trigger={
                    <Button size="icon-sm" variant="outline">
                      <TrendingUpIcon className="size-4" />
                    </Button>
                  }
                />
              )}
              <ShareButton />
              {sessionUser && (
                <Button variant="outline" size="icon-sm" asChild>
                  <Link to="/vault/$videoId/suggest" params={{ videoId }}>
                    <PencilIcon className="size-4" />
                  </Link>
                </Button>
              )}
              {isAdmin && (
                <Button variant="secondary" size="icon-sm" asChild>
                  <Link to="/vault/$videoId/edit" params={{ videoId }}>
                    <ShieldIcon className="size-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Disciplines */}
          {video.disciplines && video.disciplines.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {video.disciplines.map((discipline) => (
                <DisciplineBadge
                  key={discipline}
                  discipline={discipline as UserDiscipline}
                />
              ))}
            </div>
          )}

          {/* Riders */}
          {video.riders.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm">Riders:</span>
              {video.riders.map((rider) => {
                if (rider.user) {
                  return (
                    <Link
                      key={rider.id}
                      to="/users/$userId"
                      params={{ userId: rider.user.id }}
                      className="bg-muted hover:bg-muted/80 flex items-center gap-1.5 rounded-full px-2 py-1 text-sm transition-colors"
                    >
                      <Avatar
                        className="size-5"
                        cloudflareId={rider.user.avatarId}
                        alt={rider.user.name}
                      >
                        <AvatarImage width={20} quality={85} />
                        <AvatarFallback
                          className="text-[10px]"
                          name={rider.user.name}
                        />
                      </Avatar>
                      <span>{rider.user.name}</span>
                    </Link>
                  );
                }
                return (
                  <span
                    key={rider.id}
                    className="bg-muted rounded-full px-2 py-1 text-sm"
                  >
                    {rider.name}
                  </span>
                );
              })}
            </div>
          )}

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
    </>
  );
}
