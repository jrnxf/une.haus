import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks";
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FlagIcon,
  HeartIcon,
  RotateCcwIcon,
  TrashIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useState } from "react";

import pluralize from "pluralize";
import { z } from "zod";

import { confirm } from "~/components/confirm-dialog";
import { BackUpSetForm, FlagSetForm } from "~/components/forms/games/bius";
import { BaseMessageForm } from "~/components/forms/message";
import { UsersDialog } from "~/components/likes-dialog";
import { MessageAuthor } from "~/components/messages/message-author";
import { MessageBubble } from "~/components/messages/message-bubble";
import { ShareButton } from "~/components/share-button";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { VideoPlayer } from "~/components/video-player";
import { games } from "~/lib/games";
import { useDeleteSet } from "~/lib/games/bius/hooks";
import { invariant } from "~/lib/invariant";
import { messages } from "~/lib/messages";
import { useCreateMessage } from "~/lib/messages/hooks";
import { useSessionUser } from "~/lib/session/hooks";
import { session } from "~/lib/session/index";
import type { ServerFnReturn } from "~/lib/types";
import { cn } from "~/lib/utils";

const pathParametersSchema = z.object({
  setId: z.coerce.number(),
});

export const Route = createFileRoute("/games/bius/sets/$setId/")({
  component: RouteComponent,
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { setId }, preload }) => {
    try {
      await context.queryClient.ensureQueryData(
        games.bius.sets.get.queryOptions({ setId }),
      );
      await context.queryClient.ensureQueryData(
        messages.list.queryOptions({ type: "biuSet", id: setId }),
      );
    } catch {
      // Only show flash message on actual navigation, not preload
      if (!preload) {
        await session.flash.set.fn({ data: { message: "Set not found" } });
      }
      throw redirect({ to: "/games/bius" });
    }
  },
});

function RouteComponent() {
  const { setId } = Route.useParams();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
      <SetView setId={setId} />
    </div>
  );
}

function SetView({ setId }: { setId: number }) {
  const { data: set } = useSuspenseQuery(
    games.bius.sets.get.queryOptions({ setId }),
  );
  const { data: chain } = useSuspenseQuery(
    games.bius.chain.active.queryOptions(),
  );

  invariant(set, "Set not found");

  const record = { type: "biuSet" as const, id: setId };
  const messagesQuery = useSuspenseQuery(messages.list.queryOptions(record));
  const createMessage = useCreateMessage(record);
  const deleteSet = useDeleteSet();

  const sessionUser = useSessionUser();
  const isOwner = set.user.id === sessionUser?.id;
  const isFlagged = !!set.flaggedAt;

  // Check if this is the latest set in the chain
  const latestSet = chain?.sets?.[0];
  const isLatest = latestSet?.id === set.id;

  // Can back up if: user logged in, chain active, not own set, is latest, not flagged
  const canBackUp =
    sessionUser &&
    chain?.status === "active" &&
    !isOwner &&
    isLatest &&
    !isFlagged;

  // Can delete if: owner and latest (no one has backed it up yet)
  const canDelete = isOwner && isLatest;

  const authUserLiked = set.likes.some(
    (like: { user: { id: number } }) => like.user.id === sessionUser?.id,
  );

  const likeUnlike = useLikeUnlikeRecord({
    record,
    authUserLiked,
    optimisticUpdateQueryKey: games.bius.sets.get.queryOptions({ setId })
      .queryKey,
  });

  const [showFlagDialog, setShowFlagDialog] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{set.name}</h1>
            {isLatest && (
              <Badge variant="outline" className="text-xs">
                Latest
              </Badge>
            )}
            {isFlagged && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangleIcon className="mr-1 size-3" />
                Flagged
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            by {set.user.name} - Position #{set.position}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {sessionUser && (
            <Button
              size="icon-sm"
              variant="outline"
              onClick={likeUnlike.mutate}
              aria-label={authUserLiked ? "Unlike" : "Like"}
            >
              <HeartIcon
                className={cn(
                  "size-4",
                  authUserLiked && "fill-red-700/50 stroke-red-700",
                )}
              />
            </Button>
          )}
          {set.likes.length > 0 && (
            <UsersDialog
              users={set.likes.map(
                (l: {
                  user: { id: number; name: string; avatarId: string | null };
                }) => l.user,
              )}
              title={`${set.likes.length} ${pluralize("Like", set.likes.length)}`}
              trigger={
                <Button
                  size="icon-sm"
                  variant="outline"
                  aria-label="View likes"
                >
                  <TrendingUpIcon className="size-4" />
                </Button>
              }
            />
          )}
          <ShareButton />
        </div>
      </div>

      {/* Parent set reference */}
      {set.parentSet && (
        <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <span>Backed up</span>
          <Link
            to="/games/bius/sets/$setId"
            params={{ setId: set.parentSet.id }}
            className="text-foreground hover:underline"
          >
            {set.parentSet.name}
          </Link>
          {set.parentSet.user && <span>by {set.parentSet.user.name}</span>}
        </div>
      )}

      {/* Video */}
      {set.video?.playbackId && (
        <VideoPlayer playbackId={set.video.playbackId} />
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {canBackUp && (
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <RotateCcwIcon className="mr-2 size-4" />
                Back It Up
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Back Up: {set.name}</DialogTitle>
              </DialogHeader>
              <BackUpSetForm parentSetId={set.id} />
            </DialogContent>
          </Dialog>
        )}

        {!isFlagged && sessionUser && !isOwner && (
          <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FlagIcon className="mr-2 size-4" />
                Flag
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Flag This Set</DialogTitle>
              </DialogHeader>
              <FlagSetForm
                setId={set.id}
                onSuccess={() => setShowFlagDialog(false)}
              />
            </DialogContent>
          </Dialog>
        )}

        {canDelete && (
          <Button
            variant="outline"
            onClick={() =>
              confirm.open({
                title: "Delete Set",
                description:
                  "Are you sure you want to delete this set? This action cannot be undone.",
                confirmText: "Delete",
                onConfirm: () => {
                  deleteSet.mutate({ data: { setId: set.id } });
                },
              })
            }
          >
            <TrashIcon className="mr-2 size-4" />
            Delete
          </Button>
        )}
      </div>

      {/* Flag info */}
      {isFlagged && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive flex items-center gap-2 text-base">
              <AlertTriangleIcon className="size-4" />
              This set has been flagged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Reason: {set.flagReason || "No reason provided"}
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              An admin will review this flag. The chain is paused until
              resolved.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      <CollapsibleMessages
        record={record}
        messages={messagesQuery.data.messages}
        onCreateMessage={(content) => createMessage.mutate(content)}
      />
    </div>
  );
}

type MessageType = ServerFnReturn<typeof messages.list.fn>["messages"][number];

const INITIAL_VISIBLE_COUNT = 3;

function CollapsibleMessages({
  record,
  messages: messageList,
  onCreateMessage,
}: {
  record: { type: "biuSet"; id: number };
  messages: MessageType[];
  onCreateMessage: (content: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sessionUser = useSessionUser();

  const hasMoreMessages = messageList.length > INITIAL_VISIBLE_COUNT;
  const visibleMessages = isExpanded
    ? messageList
    : messageList.slice(-INITIAL_VISIBLE_COUNT);
  const hiddenCount = messageList.length - INITIAL_VISIBLE_COUNT;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-muted-foreground text-sm font-medium">
          Messages ({messageList.length})
        </h3>
        {hasMoreMessages && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-1 text-xs"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                Show less
                <ChevronUpIcon className="size-3" />
              </>
            ) : (
              <>
                Show {hiddenCount} more
                <ChevronDownIcon className="size-3" />
              </>
            )}
          </Button>
        )}
      </div>

      {messageList.length === 0 ? (
        <p className="text-muted-foreground text-sm">No messages yet.</p>
      ) : (
        <div className="space-y-2">
          {visibleMessages.map((message, index) => {
            const isAuthUserMessage = Boolean(
              sessionUser && sessionUser.id === message.user.id,
            );
            const prevMessage = visibleMessages[index - 1];
            const isNewSection = prevMessage?.user.id !== message.user.id;

            return (
              <div
                key={message.id}
                className={cn(
                  "flex max-w-full flex-col",
                  isAuthUserMessage && "items-end",
                )}
              >
                {isNewSection && (
                  <div className={cn("mb-1", index !== 0 && "mt-3")}>
                    <MessageAuthor message={message} />
                  </div>
                )}
                <MessageBubble parent={record} message={message} />
              </div>
            );
          })}
        </div>
      )}

      <BaseMessageForm onSubmit={onCreateMessage} />
    </div>
  );
}
