import { useSuspenseInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { SendIcon } from "lucide-react";
import { useDeferredValue, useMemo } from "react";
import { z } from "zod";

import { ActivityCard } from "~/components/activity/activity-card";
import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { users } from "~/lib/users";
import type { ActivityTypeFilter } from "~/lib/users/schemas";

const searchSchema = z.object({
  category: z.enum(["all", "posts", "games"]).optional().catch("all"),
  game: z.enum(["all", "riu", "biu", "siu"]).optional().catch("all"),
  riu: z.enum(["all", "sets", "submissions"]).optional().catch("all"),
});

type SearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/users/$userId/activity")({
  validateSearch: searchSchema,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      users.get.queryOptions({ userId: Number(params.userId) }),
    );
    await context.queryClient.ensureInfiniteQueryData(
      users.activity.infiniteQueryOptions({ userId: Number(params.userId) }),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { userId } = Route.useParams();
  const router = useRouter();
  const search = Route.useSearch();

  const category = search.category ?? "all";
  const gameFilter = search.game ?? "all";
  const riuFilter = search.riu ?? "all";

  const { data: user } = useSuspenseQuery(
    users.get.queryOptions({ userId: Number(userId) }),
  );

  const deferredCategory = useDeferredValue(category);
  const deferredGameFilter = useDeferredValue(gameFilter);
  const deferredRiuFilter = useDeferredValue(riuFilter);

  // Convert hierarchical filters to activity type filter
  const activityTypes = useMemo(() => {
    if (deferredCategory === "posts") {
      return ["post"] as ActivityTypeFilter[];
    }
    if (deferredCategory === "games") {
      if (deferredGameFilter === "riu") {
        if (deferredRiuFilter === "sets")
          return ["riuSet"] as ActivityTypeFilter[];
        if (deferredRiuFilter === "submissions")
          return ["riuSubmission"] as ActivityTypeFilter[];
        return ["riuSet", "riuSubmission"] as ActivityTypeFilter[];
      }
      if (deferredGameFilter === "biu") return ["biuSet"] as ActivityTypeFilter[];
      if (deferredGameFilter === "siu")
        return ["siuStack"] as ActivityTypeFilter[];
      return [
        "riuSet",
        "riuSubmission",
        "biuSet",
        "siuStack",
      ] as ActivityTypeFilter[];
    }
    // "all" - posts + all games
    return [
      "post",
      "riuSet",
      "riuSubmission",
      "biuSet",
      "siuStack",
    ] as ActivityTypeFilter[];
  }, [deferredCategory, deferredGameFilter, deferredRiuFilter]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      users.activity.infiniteQueryOptions({
        userId: Number(userId),
        // Pass first type if only one, otherwise fetch all and filter client-side
        type: activityTypes.length === 1 ? activityTypes[0] : undefined,
      }),
    );

  const items = useMemo(() => {
    const allItems = data?.pages.flatMap((p) => p.items) ?? [];
    // Filter client-side when multiple types selected
    if (activityTypes.length > 1) {
      return allItems.filter((item) =>
        activityTypes.includes(item.type as ActivityTypeFilter),
      );
    }
    return allItems;
  }, [data, activityTypes]);

  const updateSearch = (updates: Partial<SearchParams>) => {
    router.navigate({
      to: ".",
      search: (prev) => {
        const next = { ...prev, ...updates };
        // Clean up undefined/"all" values to keep URL clean
        if (next.category === "all") next.category = undefined;
        if (next.game === "all") next.game = undefined;
        if (next.riu === "all") next.riu = undefined;
        // Reset sub-filters when parent changes
        if (updates.category && updates.category !== "games") {
          next.game = undefined;
          next.riu = undefined;
        }
        if (updates.game && updates.game !== "riu") {
          next.riu = undefined;
        }
        return next;
      },
      replace: true,
    });
  };

  const getEmptyMessage = () => {
    if (category === "posts") return "No posts found.";
    if (category === "games") {
      if (gameFilter === "riu") {
        if (riuFilter === "sets") return "No RIU sets found.";
        if (riuFilter === "submissions") return "No RIU submissions found.";
        return "No RIU activity found.";
      }
      if (gameFilter === "biu") return "No BIU activity found.";
      if (gameFilter === "siu") return "No SIU activity found.";
      return "No game activity found.";
    }
    return "No activity in the past year.";
  };

  return (
    <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">{user.name}'s Activity</h1>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={category}
            onValueChange={(v) =>
              updateSearch({ category: v as SearchParams["category"] })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="posts">Posts</SelectItem>
              <SelectItem value="games">Games</SelectItem>
            </SelectContent>
          </Select>

          {category === "games" && (
            <Select
              value={gameFilter}
              onValueChange={(v) =>
                updateSearch({ game: v as SearchParams["game"] })
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Games</SelectItem>
                <SelectItem value="riu">RIU</SelectItem>
                <SelectItem value="biu">BIU</SelectItem>
                <SelectItem value="siu">SIU</SelectItem>
              </SelectContent>
            </Select>
          )}

          {category === "games" && gameFilter === "riu" && (
            <Select
              value={riuFilter}
              onValueChange={(v) =>
                updateSearch({ riu: v as SearchParams["riu"] })
              }
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sets & Submissions</SelectItem>
                <SelectItem value="sets">Sets</SelectItem>
                <SelectItem value="submissions">Submissions</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-6">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SendIcon />
              </EmptyMedia>
              <EmptyTitle>No activity</EmptyTitle>
              <EmptyDescription>{getEmptyMessage()}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4">
            {items.map((item) => (
              <ActivityCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>

          {hasNextPage && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
