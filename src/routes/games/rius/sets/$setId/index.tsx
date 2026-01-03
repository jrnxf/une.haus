import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks";
import {
  HeartIcon,
  PencilIcon,
  Share2Icon,
  TrashIcon,
  TrendingUpIcon,
} from "lucide-react";

import { z } from "zod";

import { confirm } from "~/components/confirm-dialog";
import { CreateRiuSubmissionForm } from "~/components/forms/games/rius";
import { UsersDialog } from "~/components/likes-dialog";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { VideoPlayer } from "~/components/video-player";
import { games } from "~/lib/games";
import { invariant } from "~/lib/invariant";
import { messages } from "~/lib/messages";
import { useCreateMessage } from "~/lib/messages/hooks";
import { useSessionUser } from "~/lib/session/hooks";
import { session } from "~/lib/session/index";
import { cn } from "~/lib/utils";
import { MessagesView } from "~/views/messages";

const pathParametersSchema = z.object({
  setId: z.coerce.number(),
});

export const Route = createFileRoute("/games/rius/sets/$setId/")({
  component: RouteComponent,
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { setId } }) => {
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
        await session.flash.set.fn({ data: { message: "Set not found" } });
        throw redirect({ to: "/games/rius" });
      }
    };

    await ensureSet();
  },
});

function RouteComponent() {
  const { setId } = Route.useParams();

  return (
    <div className="mx-auto flex w-full max-w-4xl grow overflow-hidden overflow-y-auto px-2 py-4">
      <div
        className="flex w-full max-w-4xl grow overflow-hidden overflow-y-auto px-4"
        id="main-content"
      >
        <SetView setId={setId} />
      </div>
    </div>
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
    <div className="mx-auto flex h-auto w-full max-w-4xl flex-col justify-start gap-6 p-4">
      <div className="flex items-center gap-3">
        <div className="w-full space-y-1">
          <div className="flex items-center gap-2 text-2xl leading-none font-semibold tracking-tight">
            {set.name}
          </div>
        </div>

        <div className="text-muted-foreground text-sm">{set.user.name}</div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="icon-sm" variant="outline" onClick={likeUnlike.mutate}>
            <HeartIcon
              className={cn(
                "size-4",
                authUserLiked && "fill-red-700/50 stroke-red-700",
              )}
            />
          </Button>
          {set.likes.length > 0 && (
            <UsersDialog
              users={set.likes?.map((l) => l.user) ?? []}
              title={`${set.likes?.length ?? 0} Likes`}
              trigger={
                <Button size="icon-sm" variant="outline">
                  <TrendingUpIcon className="size-4" />
                </Button>
              }
            />
          )}
          <Button size="icon-sm" variant="outline" disabled>
            <Share2Icon className="size-4" />
          </Button>
        </div>
      </div>

      <div className="wrap-break-word whitespace-pre-wrap">
        <p>{set.instructions}</p>
      </div>

      {isOwner && (
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="outline" disabled>
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
          >
            <TrashIcon className="size-4" />
          </Button>
        </div>
      )}

      {set.video && set.video.playbackId && (
        <VideoPlayer playbackId={set.video.playbackId} />
      )}

      <Tabs>
        <TabsList>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
          <MessagesView
            record={record}
            messages={messagesQuery.data.messages}
            handleCreateMessage={(content) => createMessage.mutate(content)}
          />
        </TabsContent>

        <TabsContent value="submissions">
          <CreateRiuSubmissionForm riuSetId={setId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
