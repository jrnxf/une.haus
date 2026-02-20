import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ArrowRight, HeartIcon, TrendingUpIcon } from "lucide-react";
import pluralize from "pluralize";
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks";

import { toast } from "sonner";
import { z } from "zod";

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
import { VideoPlayer } from "~/components/video-player";
import type { UserDiscipline, UtvVideoSuggestionDiff } from "~/db/schema";
import { flashMessage } from "~/lib/flash";
import { invariant } from "~/lib/invariant";
import { messages } from "~/lib/messages";
import { useCreateMessage } from "~/lib/messages/hooks";
import { session } from "~/lib/session";
import { useSessionUser } from "~/lib/session/hooks";
import { cn } from "~/lib/utils";
import { utv } from "~/lib/utv/core";
import { MessagesView } from "~/views/messages";

const DISCIPLINE_LABELS: Record<UserDiscipline, string> = {
  street: "Street",
  flatland: "Flatland",
  trials: "Trials",
  freestyle: "Freestyle",
  mountain: "Mountain",
  distance: "Distance",
  other: "Other",
};

const pathParametersSchema = z.object({
  suggestionId: z.coerce.number(),
});

export const Route = createFileRoute(
  "/_authed/vault/suggestions/$suggestionId/",
)({
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { suggestionId }, preload }) => {
    try {
      const [sessionData] = await Promise.all([
        context.queryClient.ensureQueryData(session.get.queryOptions()),
        context.queryClient.ensureQueryData(
          utv.suggestions.get.queryOptions({ id: suggestionId }),
        ),
        context.queryClient.ensureQueryData(
          messages.list.queryOptions({
            type: "utvVideoSuggestion",
            id: suggestionId,
          }),
        ),
      ]);
      return { isAdmin: sessionData.user?.id === 1 };
    } catch {
      if (!preload) {
        await flashMessage("Suggestion not found");
      }
      throw redirect({ to: "/vault/review" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { suggestionId } = Route.useParams();
  const { isAdmin } = Route.useLoaderData();

  return (
    <div className="h-full min-h-0 overflow-y-auto" id="main-content">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4">
        <SuggestionView suggestionId={suggestionId} isAdmin={isAdmin} />
      </div>
    </div>
  );
}

function DiffItem({
  label,
  oldValue,
  newValue,
}: {
  label: string;
  oldValue: string | null;
  newValue: string | null;
}) {
  if (!oldValue && !newValue) {
    return null;
  }

  return (
    <div className="rounded-md border p-3">
      <h4 className="text-muted-foreground mb-2 text-sm font-medium">
        {label}
      </h4>
      <div className="flex items-center gap-2 text-sm">
        <span className="line-through opacity-50">{oldValue || "(empty)"}</span>
        <ArrowRight className="text-muted-foreground size-4 shrink-0" />
        <span className="font-medium">{newValue || "(empty)"}</span>
      </div>
    </div>
  );
}

function DisciplinesDiff({
  old: oldDisciplines,
  new: newDisciplines,
}: {
  old: UserDiscipline[] | null;
  new: UserDiscipline[] | null;
}) {
  const formatDisciplines = (disciplines: UserDiscipline[] | null) => {
    if (!disciplines || disciplines.length === 0) return "(none)";
    return disciplines.map((d) => DISCIPLINE_LABELS[d]).join(", ");
  };

  return (
    <div className="rounded-md border p-3">
      <h4 className="text-muted-foreground mb-2 text-sm font-medium">
        Disciplines
      </h4>
      <div className="flex items-center gap-2 text-sm">
        <span className="line-through opacity-50">
          {formatDisciplines(oldDisciplines)}
        </span>
        <ArrowRight className="text-muted-foreground size-4 shrink-0" />
        <span className="font-medium">{formatDisciplines(newDisciplines)}</span>
      </div>
    </div>
  );
}

function formatRiders(
  riders: { userId: number | null; name: string | null }[],
) {
  if (riders.length === 0) return "(none)";
  return riders.map((r) => r.name ?? `User #${r.userId}`).join(", ");
}

function RidersDiff({
  old: oldRiders,
  new: newRiders,
}: {
  old: { userId: number | null; name: string | null }[];
  new: { userId: number | null; name: string | null }[];
}) {
  return (
    <div className="rounded-md border p-3">
      <h4 className="text-muted-foreground mb-2 text-sm font-medium">Riders</h4>
      <div className="flex items-center gap-2 text-sm">
        <span className="line-through opacity-50">
          {formatRiders(oldRiders)}
        </span>
        <ArrowRight className="text-muted-foreground size-4 shrink-0" />
        <span className="font-medium">{formatRiders(newRiders)}</span>
      </div>
    </div>
  );
}

function SuggestionView({
  suggestionId,
  isAdmin,
}: {
  suggestionId: number;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: suggestion } = useSuspenseQuery(
    utv.suggestions.get.queryOptions({ id: suggestionId }),
  );

  invariant(suggestion, "Suggestion not found");

  const record = { type: "utvVideoSuggestion" as const, id: suggestionId };
  const messagesQuery = useSuspenseQuery(messages.list.queryOptions(record));
  const createMessage = useCreateMessage(record);

  const sessionUser = useSessionUser();

  const authUserLiked = suggestion.likes.some(
    (like) => like.userId === sessionUser?.id,
  );

  const likeUnlike = useLikeUnlikeRecord({
    record,
    authUserLiked,
    optimisticUpdateQueryKey: utv.suggestions.get.queryOptions({
      id: suggestionId,
    }).queryKey,
  });

  const suggestionsQueryKey = utv.suggestions.list.queryOptions({
    status: "pending",
  }).queryKey;

  const reviewSuggestion = useMutation({
    mutationFn: utv.suggestions.review.fn,
    onMutate: () => {
      qc.cancelQueries({ queryKey: suggestionsQueryKey });
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.data.status === "approved"
          ? "Suggestion approved - video updated!"
          : "Suggestion rejected",
      );
      qc.removeQueries({ queryKey: suggestionsQueryKey });
      qc.removeQueries({
        queryKey: utv.get.queryOptions(suggestion.utvVideoId).queryKey,
      });
      qc.removeQueries({
        queryKey: utv.list.infiniteQueryOptions({}).queryKey,
      });
      router.navigate({ to: "/vault/review" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isPending = suggestion.status === "pending";
  const diff = suggestion.diff as UtvVideoSuggestionDiff;
  const displayTitle =
    suggestion.utvVideo.title || suggestion.utvVideo.legacyTitle;

  return (
    <>
      {suggestion.utvVideo.video?.playbackId && (
        <VideoPlayer playbackId={suggestion.utvVideo.video.playbackId} />
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <span>{displayTitle}</span>
                {diff.title && (
                  <>
                    <ArrowRight className="text-muted-foreground size-5 shrink-0" />
                    <span className="text-primary">{diff.title.new}</span>
                  </>
                )}
              </CardTitle>
              <CardDescription>Suggested edit</CardDescription>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "shrink-0 gap-1 border-0",
                suggestion.status === "pending" &&
                "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
                suggestion.status === "approved" &&
                "bg-green-500/20 text-green-700 dark:text-green-300",
                suggestion.status === "rejected" &&
                "bg-red-500/20 text-red-700 dark:text-red-300",
              )}
            >
              {suggestion.status === "pending" && "Pending"}
              {suggestion.status === "approved" && "Approved"}
              {suggestion.status === "rejected" && "Rejected"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {suggestion.reason && (
            <div className="bg-muted/50 rounded-md p-3">
              <h4 className="text-muted-foreground mb-1 text-sm font-medium">
                Reason
              </h4>
              <p className="text-sm italic">&quot;{suggestion.reason}&quot;</p>
            </div>
          )}

          <div>
            <h4 className="text-muted-foreground mb-2 text-sm font-medium">
              Proposed Changes
            </h4>
            <div className="space-y-2">
              {diff.title && (
                <DiffItem
                  label="Title"
                  oldValue={diff.title.old}
                  newValue={diff.title.new}
                />
              )}
              {diff.disciplines && (
                <DisciplinesDiff
                  old={diff.disciplines.old}
                  new={diff.disciplines.new}
                />
              )}
              {diff.riders && (
                <RidersDiff old={diff.riders.old} new={diff.riders.new} />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2">
              <Avatar
                className="size-6"
                cloudflareId={suggestion.submittedBy.avatarId}
                alt={suggestion.submittedBy.name}
              >
                <AvatarImage width={24} quality={85} />
                <AvatarFallback
                  className="text-xs"
                  name={suggestion.submittedBy.name}
                />
              </Avatar>
              <span className="text-muted-foreground text-sm">
                Suggested by {suggestion.submittedBy.name}
              </span>
            </div>

            <div className="flex items-center gap-1">
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
              {suggestion.likes.length > 0 && (
                <UsersDialog
                  users={suggestion.likes.map((l) => l.user)}
                  title={`${suggestion.likes.length} ${pluralize("Like", suggestion.likes.length)}`}
                  trigger={
                    <Button size="icon-sm" variant="outline">
                      <TrendingUpIcon className="size-4" />
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isAdmin && isPending && (
        <div className="flex justify-end gap-2">
          <Button
            variant="destructive"
            onClick={() =>
              reviewSuggestion.mutate({
                data: { id: suggestionId, status: "rejected" },
              })
            }
            disabled={reviewSuggestion.isPending}
          >
            Reject
          </Button>
          <Button
            onClick={() =>
              reviewSuggestion.mutate({
                data: { id: suggestionId, status: "approved" },
              })
            }
            disabled={reviewSuggestion.isPending}
          >
            Approve
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
