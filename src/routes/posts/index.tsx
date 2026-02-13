import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FilterIcon,
  GhostIcon,
  HeartIcon,
  MessageCircleIcon,
  PaperclipIcon,
  XIcon,
} from "lucide-react";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { useDeferredValue, useMemo, useState } from "react";
import { InView } from "react-intersection-observer";

import { useDebounceValue } from "usehooks-ts";

import { Badges } from "~/components/badges";
import { FilterPanel } from "~/components/filter-drawer";
import { BadgeInput } from "~/components/input/badge-input";
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
import { Input } from "~/components/ui/input";
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

/** Nuqs parser for comma-delimited tags */
const parseAsTags = parseAsArrayOf(parseAsString, ",");

function RouteComponent() {
  // Use nuqs for URL state (stringifySearch keeps commas readable)
  const [query, setQuery] = useQueryState("q", {
    defaultValue: "",
    shallow: false,
    history: "replace",
  });
  const [tags, setTags] = useQueryState("tags", {
    ...parseAsTags,
    defaultValue: [] as string[],
    shallow: false,
    history: "replace",
  });

  // Debounce query for API calls
  const [debouncedQuery] = useDebounceValue(query, 300);
  const deferredQuery = useDeferredValue(debouncedQuery);
  const deferredTags = useDeferredValue(tags);

  const [filtersOpen, setFiltersOpen] = useState(
    Boolean(query || tags.length > 0),
  );

  const hasActiveFilters = Boolean(query || tags.length > 0);

  const handleQueryChange = (value: string) => {
    setQuery(value || null);
  };

  const handleTagsChange = (newTags: (typeof POST_TAGS)[number][]) => {
    setTags(newTags.length > 0 ? newTags : null);
  };

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
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>posts</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Actions>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="relative"
          >
            <FilterIcon className="size-4" />
            Filters
            {hasActiveFilters && !filtersOpen && (
              <span className="bg-primary absolute -top-1 -right-1 size-2 rounded-full" />
            )}
          </Button>
          <Button asChild size="sm">
            <Link to="/posts/create">Create</Link>
          </Button>
        </PageHeader.Actions>
      </PageHeader>

      <div className="h-full overflow-y-auto" ref={setScrollRoot}>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 p-4">
        <FilterPanel open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search posts..."
              className="pr-8"
            />
            {query && (
              <button
                type="button"
                onClick={() => handleQueryChange("")}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
          <BadgeInput
            defaultSelections={tags as (typeof POST_TAGS)[number][]}
            onChange={handleTagsChange}
            options={POST_TAGS}
          />
        </FilterPanel>
        {displayedPosts.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <GhostIcon />
              </EmptyMedia>
              <EmptyTitle>No posts</EmptyTitle>
              <EmptyDescription>
                There are no posts to display at the moment.
              </EmptyDescription>
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
              <div className="flex flex-col gap-4 rounded-md border bg-card p-3 sm:flex-row">
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
