import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  GhostIcon,
  HeartIcon,
  MessageCircleIcon,
  PaperclipIcon,
} from "lucide-react";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { InView } from "react-intersection-observer";

import { useDebounceCallback } from "usehooks-ts";

import { Badges } from "~/components/badges";
import { PageHeader } from "~/components/page-header";
import { TimeAgo } from "~/components/time-ago";
import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  Filters,
  type Filter,
  type FilterFieldConfig,
} from "~/components/ui/filters";
import { getMuxPoster } from "~/components/video-player";
import { POST_TAGS } from "~/db/schema";
import { posts } from "~/lib/posts";

export const Route = createFileRoute("/posts/")({
  validateSearch: posts.list.schema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureInfiniteQueryData(
      posts.list.infiniteQueryOptions(deps),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const searchParams = Route.useSearch();
  const router = useRouter();

  // --- Text filter: local state for immediate input feedback ---
  const [queryInput, setQueryInput] = useState(searchParams.q ?? "");
  const deferredQuery = useDeferredValue(queryInput);

  // URL update is for bookmarking only — debounced so it doesn't fire on every keystroke
  const debouncedNavigate = useDebounceCallback(
    (updates: { q?: string; tags?: string[] }) => {
      router.navigate({
        to: "/posts",
        search: (prev) => ({
          ...prev,
          q: updates.q || undefined,
          tags:
            updates.tags && updates.tags.length > 0 ? updates.tags : undefined,
          cursor: undefined,
        }),
        replace: true,
      });
    },
    300,
  );

  // --- Multiselect filter: local state, deferred for query ---
  const [tags, setTags] = useState<string[]>(searchParams.tags ?? []);
  const deferredTags = useDeferredValue(tags);

  // Track which filter fields are open (text filters can be open with empty value)
  const [activeFields, setActiveFields] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (queryInput) initial.add("q");
    if (tags.length > 0) initial.add("tags");
    return initial;
  });

  const filterFields: FilterFieldConfig<string>[] = useMemo(
    () => [
      {
        key: "q",
        label: "Search",
        type: "text" as const,
        placeholder: "search...",
        operators: [{ value: "contains", label: "contains" }],
        defaultOperator: "contains",
      },
      {
        key: "tags",
        label: "Tags",
        type: "multiselect" as const,
        operators: [{ value: "is_any_of", label: "includes" }],
        defaultOperator: "is_any_of",
        options: POST_TAGS.map((t) => ({ value: t, label: t })),
      },
    ],
    [],
  );

  // Derive filters from LOCAL state (immediate feedback, not URL)
  const filters = useMemo<Filter<string>[]>(() => {
    const result: Filter<string>[] = [];
    if (activeFields.has("q")) {
      result.push({
        id: "q",
        field: "q",
        operator: "contains",
        values: queryInput ? [queryInput] : [],
      });
    }
    if (activeFields.has("tags") || tags.length > 0) {
      result.push({
        id: "tags",
        field: "tags",
        operator: "is_any_of",
        values: tags,
      });
    }
    return result;
  }, [queryInput, tags, activeFields]);

  const handleFiltersChange = useCallback(
    (next: Filter<string>[]) => {
      const qFilter = next.find((f) => f.field === "q");
      const tagsFilter = next.find((f) => f.field === "tags");

      setActiveFields((prev) => {
        const wantQ = Boolean(qFilter);
        const wantTags = Boolean(tagsFilter);
        if (prev.has("q") === wantQ && prev.has("tags") === wantTags) {
          return prev;
        }
        const s = new Set<string>();
        if (wantQ) s.add("q");
        if (wantTags) s.add("tags");
        return s;
      });

      // Text: update local state immediately (URL updates via debounce)
      const newQuery = qFilter?.values[0] || "";
      setQueryInput(newQuery);

      // Multiselect: update local state immediately
      const newTags =
        tagsFilter && tagsFilter.values.length > 0 ? tagsFilter.values : [];
      setTags(newTags);

      // Debounce URL update
      debouncedNavigate({ q: newQuery, tags: newTags });
    },
    [debouncedNavigate],
  );

  const {
    data: postsPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSuspenseInfiniteQuery(
    posts.list.infiniteQueryOptions({
      q: deferredQuery || undefined,
      tags: deferredTags.length > 0 ? deferredTags : undefined,
    }),
  );

  const displayedPosts = useMemo(() => postsPages.pages.flat(), [postsPages]);
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);

  // NOTE: opting to not virtualize this bc in 99% of cases it's probably
  // unnecessary and it means we can't have scroll restoration

  return (
    <>
      <PageHeader maxWidth="max-w-4xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>posts</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Actions>
          <Button asChild>
            <Link to="/posts/create">Create</Link>
          </Button>
        </PageHeader.Actions>
      </PageHeader>

      <div className="h-full overflow-y-auto" ref={setScrollRoot}>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 p-4">
          <Filters
            filters={filters}
            fields={filterFields}
            onChange={handleFiltersChange}
            size="sm"
          />
          {displayedPosts.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GhostIcon />
                </EmptyMedia>
                <EmptyTitle>no posts</EmptyTitle>
                <EmptyDescription>try adjusting your filters</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {displayedPosts.map((post) => {
            const posterUrl =
              post.imageId ||
              (post.video?.playbackId &&
                getMuxPoster({ playbackId: post.video.playbackId })) ||
              (post.youtubeVideoId &&
                `https://img.youtube.com/vi/${post.youtubeVideoId}/hqdefault.jpg`);
            return (
              <Link
                className="ring-offset-background focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
                key={post.id}
                params={{ postId: post.id }}
                to="/posts/$postId"
              >
                <div className="bg-card flex flex-col gap-4 rounded-md border p-3 sm:flex-row">
                  <div className="flex w-full flex-col gap-2">
                    <p className="truncate font-semibold">
                      {Boolean(posterUrl) && (
                        <PaperclipIcon className="text-muted-foreground mr-2 inline size-3" />
                      )}
                      {post.title}
                    </p>
                    <div className="line-clamp-3 text-sm">
                      <p>{post.content}</p>
                    </div>
                    <Badges content={post.tags} />
                    <div className="flex w-full justify-between gap-4">
                      <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs sm:text-sm">
                        <span>{post.user.name}</span>
                        <span>•</span>
                        <TimeAgo date={post.createdAt} />
                      </p>
                      <div className="text-muted-foreground flex items-center gap-2 text-xs">
                        <MessageCircleIcon className="size-3" />
                        {post.counts.messages}
                        <HeartIcon className="size-3" />
                        {post.counts.likes}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
          {hasNextPage && !isFetchingNextPage && (
            <InView
              root={scrollRoot}
              rootMargin="1000px"
              onChange={(inView) => inView && fetchNextPage()}
            />
          )}
        </div>
      </div>
    </>
  );
}
