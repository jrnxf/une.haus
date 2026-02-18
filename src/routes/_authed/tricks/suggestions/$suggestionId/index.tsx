import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Heart,
  TrendingUp,
  XCircle,
} from "lucide-react";

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
import type { TrickSuggestionDiff } from "~/db/schema";
import { flashMessage } from "~/lib/flash";
import { invariant } from "~/lib/invariant";
import { messages } from "~/lib/messages";
import { useCreateMessage } from "~/lib/messages/hooks";
import { session } from "~/lib/session";
import { useSessionUser } from "~/lib/session/hooks";
import { tricks } from "~/lib/tricks";
import { cn } from "~/lib/utils";
import { MessagesView } from "~/views/messages";

const pathParametersSchema = z.object({
  suggestionId: z.coerce.number(),
});

export const Route = createFileRoute(
  "/_authed/tricks/suggestions/$suggestionId/",
)({
  params: {
    parse: pathParametersSchema.parse,
  },
  staticData: {
    pageHeader: {
      breadcrumbs: [
        { label: "tricks", to: "/tricks" },
        { label: "suggestion" },
      ],
      maxWidth: "4xl",
    },
  },
  loader: async ({ context, params: { suggestionId }, preload }) => {
    try {
      const [sessionData] = await Promise.all([
        context.queryClient.ensureQueryData(session.get.queryOptions()),
        context.queryClient.ensureQueryData(
          tricks.suggestions.get.queryOptions({ id: suggestionId }),
        ),
        context.queryClient.ensureQueryData(
          messages.list.queryOptions({
            type: "trickSuggestion",
            id: suggestionId,
          }),
        ),
      ]);
      return { isAdmin: sessionData.user?.id === 1 };
    } catch {
      // Only show flash message on actual navigation, not preload
      if (!preload) {
        await flashMessage("Suggestion not found");
      }
      throw redirect({ to: "/tricks/review" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { suggestionId } = Route.useParams();
  const { isAdmin } = Route.useLoaderData();

  return (
    <div className="h-full min-h-0 overflow-y-auto" id="main-content">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
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
  // Don't render if both values are empty
  if (!oldValue && !newValue) {
    return null;
  }

  return (
    <div className="bg-card rounded-md border p-3">
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
    tricks.suggestions.get.queryOptions({ id: suggestionId }),
  );

  invariant(suggestion, "Suggestion not found");

  const record = { type: "trickSuggestion" as const, id: suggestionId };
  const messagesQuery = useSuspenseQuery(messages.list.queryOptions(record));
  const createMessage = useCreateMessage(record);

  const sessionUser = useSessionUser();

  const authUserLiked = suggestion.likes.some(
    (like) => like.userId === sessionUser?.id,
  );

  const likeUnlike = useLikeUnlikeRecord({
    record,
    authUserLiked,
    optimisticUpdateQueryKey: tricks.suggestions.get.queryOptions({
      id: suggestionId,
    }).queryKey,
  });

  const suggestionsQueryKey = tricks.suggestions.list.queryOptions({
    status: "pending",
  }).queryKey;
  const graphQueryKey = tricks.graph.queryOptions().queryKey;

  const reviewSuggestion = useMutation({
    mutationFn: tricks.suggestions.review.fn,
    onMutate: () => {
      qc.cancelQueries({ queryKey: suggestionsQueryKey });
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.data.status === "approved"
          ? "Suggestion approved - trick updated!"
          : "Suggestion rejected",
      );
      // Remove queries so loader fetches fresh data on navigation
      qc.removeQueries({ queryKey: suggestionsQueryKey });
      qc.removeQueries({ queryKey: graphQueryKey });
      router.navigate({ to: "/tricks/review", search: { tab: "suggestions" } });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isPending = suggestion.status === "pending";
  const diff = suggestion.diff as TrickSuggestionDiff;

  return (
    <>
      <Link
        to="/tricks/review"
        search={{ tab: "suggestions" }}
        className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        <span>back to review</span>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <span>{suggestion.trick.name}</span>
                {diff.name && (
                  <>
                    <ArrowRight className="text-muted-foreground size-5 shrink-0" />
                    <span className="text-primary">{diff.name.new}</span>
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
              {diff.name && (
                <DiffItem
                  label="Name"
                  oldValue={diff.name.old}
                  newValue={diff.name.new}
                />
              )}
              {diff.definition && (
                <DiffItem
                  label="Definition"
                  oldValue={diff.definition.old}
                  newValue={diff.definition.new}
                />
              )}
              {diff.inventedBy && (
                <DiffItem
                  label="Invented By"
                  oldValue={diff.inventedBy.old}
                  newValue={diff.inventedBy.new}
                />
              )}
              {diff.yearLanded && (
                <DiffItem
                  label="Year Landed"
                  oldValue={diff.yearLanded.old?.toString() ?? null}
                  newValue={diff.yearLanded.new?.toString() ?? null}
                />
              )}
              {diff.videoUrl && (
                <DiffItem
                  label="Video URL"
                  oldValue={diff.videoUrl.old}
                  newValue={diff.videoUrl.new}
                />
              )}
              {diff.videoTimestamp && (
                <DiffItem
                  label="Video Timestamp"
                  oldValue={diff.videoTimestamp.old}
                  newValue={diff.videoTimestamp.new}
                />
              )}
              {diff.notes && (
                <DiffItem
                  label="Notes"
                  oldValue={diff.notes.old}
                  newValue={diff.notes.new}
                />
              )}
              {diff.alternateNames && (
                <div className="bg-card rounded-md border p-3">
                  <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                    Alternate Names
                  </h4>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="line-through opacity-50">
                      {diff.alternateNames.old.length > 0
                        ? diff.alternateNames.old.join(", ")
                        : "(none)"}
                    </span>
                    <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                    <span className="font-medium">
                      {diff.alternateNames.new.length > 0
                        ? diff.alternateNames.new.join(", ")
                        : "(none)"}
                    </span>
                  </div>
                </div>
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
                <Heart
                  className={cn(
                    "size-4",
                    authUserLiked && "fill-red-700/50 stroke-red-700",
                  )}
                />
              </Button>
              {suggestion.likes.length > 0 && (
                <UsersDialog
                  users={suggestion.likes.map((l) => l.user)}
                  title={`${suggestion.likes.length} Likes`}
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
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() =>
              reviewSuggestion.mutate({
                data: { id: suggestionId, status: "rejected" },
              })
            }
            disabled={reviewSuggestion.isPending}
          >
            <XCircle className="mr-2 size-4" />
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
            <CheckCircle className="mr-2 size-4" />
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
