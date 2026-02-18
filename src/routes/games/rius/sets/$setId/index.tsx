import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  HeartIcon,
  MessageCircleIcon,
  PencilIcon,
  TrashIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useState } from "react";

import { z } from "zod";

import { confirm } from "~/components/confirm-dialog";
import { CreateRiuSubmissionForm } from "~/components/forms/games/rius";
import { BaseMessageForm } from "~/components/forms/message";
import { UsersDialog } from "~/components/likes-dialog";
import { MessageAuthor } from "~/components/messages/message-author";
import { MessageBubble } from "~/components/messages/message-bubble";
import { ShareButton } from "~/components/share-button";
import { Button } from "~/components/ui/button";
import { VideoPlayer } from "~/components/video-player";
import { games } from "~/lib/games";
import { invariant } from "~/lib/invariant";
import { messages } from "~/lib/messages";
import { useCreateMessage } from "~/lib/messages/hooks";
import { useSessionUser } from "~/lib/session/hooks";
import { session } from "~/lib/session/index";
import { type ServerFnReturn } from "~/lib/types";
import { cn } from "~/lib/utils";

const pathParametersSchema = z.object({
  setId: z.coerce.number(),
});

export const Route = createFileRoute("/games/rius/sets/$setId/")({
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
  loader: async ({ context, params: { setId }, preload }) => {
    const ensureSet = async () => {
      try {
        await context.queryClient.ensureQueryData(
          games.rius.sets.get.queryOptions({ setId }),
        );
        // Prefetch messages for the set
        await context.queryClient.ensureQueryData(
          messages.list.queryOptions({ type: "riuSet", id: setId }),
        );
      } catch {
        // Only show flash message on actual navigation, not preload
        if (!preload) {
          await session.flash.set.fn({ data: { message: "Set not found" } });
        }
        throw redirect({ to: "/games/rius" });
      }
    };

    await ensureSet();

    const setData = context.queryClient.getQueryData(
      games.rius.sets.get.queryOptions({ setId }).queryKey,
    );

    return {
      pageHeader: {
        breadcrumbOverrides: {
          2: {
            label: (setData as { name?: string } | undefined)?.name ?? "set",
          },
        },
      },
    };
  },
});

function RouteComponent() {
  const { setId } = Route.useParams();

  return (
    <>
      <div className="h-full min-h-0 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
          <SetView setId={setId} />
        </div>
      </div>
    </>
  );
}

function SetView({ setId }: { setId: number }) {
  const { data: set } = useSuspenseQuery(
    games.rius.sets.get.queryOptions({ setId }),
  );

  invariant(set, "Set not found");

  const record = { type: "riuSet" as const, id: setId };
  const messagesQuery = useSuspenseQuery(messages.list.queryOptions(record));
  const createMessage = useCreateMessage(record);

  const sessionUser = useSessionUser();

  const authUserLiked = set.likes.some(
    (like) => like.userId === sessionUser?.id,
  );

  const likeUnlike = useLikeUnlikeRecord({
    record,
    authUserLiked,
    optimisticUpdateQueryKey: games.rius.sets.get.queryOptions({ setId })
      .queryKey,
  });

  const isOwner = set.user.id === sessionUser?.id;

  return (
    <>
      <div className="flex items-start gap-3">
        <div className="w-full space-y-1">
          <div className="flex items-center gap-2 text-2xl leading-none font-semibold tracking-tight">
            {set.name}
          </div>
          <div className="text-muted-foreground shrink-0 text-sm">
            {set.user.name}
          </div>
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
              users={set.likes?.map((l) => l.user) ?? []}
              title={`${set.likes?.length ?? 0} Likes`}
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

      <div className="wrap-break-word whitespace-pre-wrap">
        <p>{set.instructions}</p>
      </div>

      {isOwner && (
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="outline" disabled aria-label="Edit">
            <PencilIcon className="size-4" />
          </Button>
          <Button
            onClick={() =>
              confirm.open({
                title: "Delete Set",
                description:
                  "Are you sure you want to delete this set? This action cannot be undone.",
                confirmText: "Delete",
                onConfirm: () => {
                  // TODO: Implement delete set functionality
                  console.log("Delete set", set.id);
                },
              })
            }
            size="icon-sm"
            variant="outline"
            aria-label="Delete"
          >
            <TrashIcon className="size-4" />
          </Button>
        </div>
      )}

      {set.video && set.video.playbackId && (
        <VideoPlayer playbackId={set.video.playbackId} />
      )}

      <CollapsibleMessages
        record={record}
        messages={messagesQuery.data.messages}
        onCreateMessage={(content) => createMessage.mutate(content)}
      />

      <div className="space-y-3">
        <h3 className="text-muted-foreground text-sm font-medium">
          Submissions
        </h3>

        {set.riu.status === "active" && !isOwner && (
          <CreateRiuSubmissionForm riuSetId={setId} />
        )}

        {set.submissions && set.submissions.length > 0 ? (
          <SubmissionsList submissions={set.submissions} />
        ) : (
          <p className="text-muted-foreground text-sm">No submissions yet.</p>
        )}
      </div>
    </>
  );
}

type SubmissionType = NonNullable<
  ServerFnReturn<typeof games.rius.sets.get.fn>
>["submissions"][number];

function SubmissionCard({ submission }: { submission: SubmissionType }) {
  return (
    <Link
      to="/games/rius/submissions/$submissionId"
      params={{ submissionId: submission.id }}
      className="block"
    >
      <Button
        variant="outline"
        className="h-auto w-full justify-between gap-6 p-4 text-left"
        asChild
      >
        <div>
          <span className="truncate text-sm font-medium">
            {submission.user.name}
          </span>
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <HeartIcon className="size-3" />
              <span>{submission.likes.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircleIcon className="size-3" />
              <span>{submission.messages.length}</span>
            </div>
          </div>
        </div>
      </Button>
    </Link>
  );
}

function SubmissionsList({ submissions }: { submissions: SubmissionType[] }) {
  return (
    <div className="flex flex-col gap-2">
      {submissions.map((submission) => (
        <SubmissionCard key={submission.id} submission={submission} />
      ))}
    </div>
  );
}

type MessageType = ServerFnReturn<typeof messages.list.fn>["messages"][number];

const INITIAL_VISIBLE_COUNT = 2;

function CollapsibleMessages({
  record,
  messages: messageList,
  onCreateMessage,
}: {
  record: { type: "riuSet"; id: number };
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
        <h3 className="text-muted-foreground text-sm font-medium">Messages</h3>
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
