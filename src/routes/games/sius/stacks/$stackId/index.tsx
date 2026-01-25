import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks";
import {
  ArchiveIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  HeartIcon,
  LayersIcon,
  TrashIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useState } from "react";

import { z } from "zod";

import { confirm } from "~/components/confirm-dialog";
import { ShareButton } from "~/components/share-button";
import { StackUpForm } from "~/components/forms/games/sius";
import { BaseMessageForm } from "~/components/forms/message";
import { ArchiveVoteButton } from "~/components/games/sius/archive-vote-button";
import { TrickLine } from "~/components/games/sius/trick-line";
import { UsersDialog } from "~/components/likes-dialog";
import { MessageAuthor } from "~/components/messages/message-author";
import { MessageBubble } from "~/components/messages/message-bubble";
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
import { useArchiveChain, useDeleteStack } from "~/lib/games/sius/hooks";
import { invariant } from "~/lib/invariant";
import { messages } from "~/lib/messages";
import { useCreateMessage } from "~/lib/messages/hooks";
import { useIsAdmin, useSessionUser } from "~/lib/session/hooks";
import { session } from "~/lib/session/index";
import type { ServerFnReturn } from "~/lib/types";
import { cn } from "~/lib/utils";

const pathParametersSchema = z.object({
  stackId: z.coerce.number(),
});

export const Route = createFileRoute("/games/sius/stacks/$stackId/")({
  component: RouteComponent,
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { stackId }, preload }) => {
    try {
      await context.queryClient.ensureQueryData(
        games.sius.stacks.get.queryOptions({ stackId }),
      );
      await context.queryClient.ensureQueryData(
        messages.list.queryOptions({ type: "siuStack", id: stackId }),
      );
      await context.queryClient.ensureQueryData(
        games.sius.stacks.line.queryOptions({ stackId }),
      );
    } catch {
      // Only show flash message on actual navigation, not preload
      if (!preload) {
        await session.flash.set.fn({ data: { message: "Stack not found" } });
      }
      throw redirect({ to: "/games/sius" });
    }
  },
});

function RouteComponent() {
  const { stackId } = Route.useParams();

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/games/sius">
          <ArrowLeftIcon className="size-4" />
          Back to Stack
        </Link>
      </Button>

      <StackView stackId={stackId} />
    </div>
  );
}

function StackView({ stackId }: { stackId: number }) {
  const { data: stack } = useSuspenseQuery(
    games.sius.stacks.get.queryOptions({ stackId }),
  );
  const { data: chain } = useSuspenseQuery(
    games.sius.chain.active.queryOptions(),
  );
  const { data: line } = useSuspenseQuery(
    games.sius.stacks.line.queryOptions({ stackId }),
  );

  invariant(stack, "Stack not found");

  const record = { type: "siuStack" as const, id: stackId };
  const messagesQuery = useSuspenseQuery(messages.list.queryOptions(record));
  const createMessage = useCreateMessage(record);
  const deleteStack = useDeleteStack();
  const archiveChain = useArchiveChain();

  const sessionUser = useSessionUser();
  const isAdmin = useIsAdmin();
  const isOwner = stack.user.id === sessionUser?.id;

  // Check if this is the latest stack in the chain
  const latestStack = chain?.stacks?.[0];
  const isLatest = latestStack?.id === stack.id;

  // Get vote info
  const voteCount = stack.chain.archiveVotes?.length ?? 0;
  const hasVoted =
    sessionUser &&
    stack.chain.archiveVotes?.some((v) => v.user.id === sessionUser.id);
  const thresholdReached = voteCount >= 5;

  // Can stack up if: user logged in, chain active, not own stack, is latest
  const canStackUp =
    sessionUser && chain?.status === "active" && !isOwner && isLatest;

  // Can delete if: owner and latest (no one has continued it)
  const canDelete = isOwner && isLatest;

  const authUserLiked = stack.likes.some(
    (like: { user: { id: number } }) => like.user.id === sessionUser?.id,
  );

  const likeUnlike = useLikeUnlikeRecord({
    record,
    authUserLiked,
    optimisticUpdateQueryKey: games.sius.stacks.get.queryOptions({ stackId })
      .queryKey,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{stack.name}</h1>
            {isLatest && (
              <Badge variant="outline" className="text-xs">
                Latest
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            by {stack.user.name} - Trick #{stack.position}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button size="icon-sm" variant="outline" onClick={likeUnlike.mutate} aria-label={authUserLiked ? "Unlike" : "Like"}>
            <HeartIcon
              className={cn(
                "size-4",
                authUserLiked && "fill-red-700/50 stroke-red-700",
              )}
            />
          </Button>
          {stack.likes.length > 0 && (
            <UsersDialog
              users={stack.likes.map(
                (l: {
                  user: { id: number; name: string; avatarId: string | null };
                }) => l.user,
              )}
              title={`${stack.likes.length} Likes`}
              trigger={
                <Button size="icon-sm" variant="outline" aria-label="View likes">
                  <TrendingUpIcon className="size-4" />
                </Button>
              }
            />
          )}
          <ShareButton />
        </div>
      </div>

      {/* Parent stack reference */}
      {stack.parentStack && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
              Continued From
            </p>
            <Link
              to="/games/sius/stacks/$stackId"
              params={{ stackId: stack.parentStack.id }}
              className="hover:text-primary font-medium transition-colors"
            >
              {stack.parentStack.name}
            </Link>
            {stack.parentStack.user && (
              <p className="text-muted-foreground text-sm">
                by {stack.parentStack.user.name}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* The Line - all tricks that need to be landed */}
      {line && line.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <LayersIcon className="size-4" />
              The Line ({line.length} {line.length === 1 ? "trick" : "tricks"})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrickLine tricks={line} />
          </CardContent>
        </Card>
      )}

      {/* Video */}
      {stack.video?.playbackId && (
        <VideoPlayer playbackId={stack.video.playbackId} />
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {canStackUp && (
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <LayersIcon className="mr-2 size-4" />
                Stack It Up
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add to the Stack</DialogTitle>
              </DialogHeader>
              <StackUpForm parentStackId={stack.id} />
            </DialogContent>
          </Dialog>
        )}

        {canDelete && (
          <Button
            variant="outline"
            onClick={() =>
              confirm.open({
                title: "Delete Stack",
                description:
                  "Are you sure you want to delete this stack? This action cannot be undone.",
                confirmText: "Delete",
                onConfirm: () => {
                  deleteStack.mutate({ data: { stackId: stack.id } });
                },
              })
            }
          >
            <TrashIcon className="mr-2 size-4" />
            Delete
          </Button>
        )}
      </div>

      {/* Vote to archive section */}
      {sessionUser && stack.chain.status === "active" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Archive Voting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Think this line is too difficult to continue? Vote to archive it.
            </p>

            <ArchiveVoteButton
              chainId={stack.chain.id}
              voteCount={voteCount}
              hasVoted={!!hasVoted}
            />

            {stack.chain.archiveVotes &&
              stack.chain.archiveVotes.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <p className="text-muted-foreground mb-2 text-xs">
                    Users who voted to archive:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {stack.chain.archiveVotes.map((vote) => (
                      <Badge key={vote.user.id} variant="secondary">
                        {vote.user.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

            {/* Admin archive button */}
            {isAdmin && thresholdReached && (
              <div className="border-destructive/30 bg-destructive/5 mt-4 border-t pt-4">
                <p className="text-muted-foreground mb-2 text-sm">
                  Vote threshold reached. As an admin, you can archive this
                  chain.
                </p>
                <Button
                  variant="destructive"
                  onClick={() =>
                    confirm.open({
                      title: "Archive Chain",
                      description:
                        "Are you sure you want to archive this chain? All participants will be notified.",
                      confirmText: "Archive",
                      onConfirm: () => {
                        archiveChain.mutate({
                          data: { chainId: stack.chain.id },
                        });
                      },
                    })
                  }
                >
                  <ArchiveIcon className="mr-2 size-4" />
                  Archive Chain
                </Button>
              </div>
            )}
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
  record: { type: "siuStack"; id: number };
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
                  <div className={cn("mb-1", index !== 0 && "mt-4")}>
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
