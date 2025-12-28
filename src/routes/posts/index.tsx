import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  FilterIcon,
  HeartIcon,
  MessageCircleIcon,
  PaperclipIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { InView } from "react-intersection-observer";

import { Badges } from "~/components/badges";
import { TimeAgo } from "~/components/time-ago";
import {
  Tray,
  TrayClose,
  TrayContent,
  TrayTitle,
  TrayTrigger,
} from "~/components/tray";
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

  const {
    data: postsPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSuspenseInfiniteQuery(posts.list.infiniteQueryOptions(searchParams));

  const displayedPosts = useMemo(() => postsPages.pages.flat(), [postsPages]);
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);

  // NOTE: opting to not virtualize this bc in 99% of cases it's probably
  // unnecessary and it means we can't have scroll restoration

  return (
    <div className="h-full overflow-y-auto" ref={setScrollRoot}>
      <div className="mx-auto grid h-full max-w-4xl grid-cols-1 grid-rows-[auto_1fr] gap-4 p-4">
        <div className="flex items-end justify-between gap-4">
          <Button asChild>
            <Link to="/posts/create">Create</Link>
          </Button>
          <div className="sticky top-3 z-10 self-end">
            <FiltersTray />
          </div>
        </div>
        {displayedPosts.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessageCircleIcon />
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
              <div className="flex flex-col gap-4 rounded-md border bg-white p-3 sm:flex-row dark:bg-[#0a0a0a]">
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
  );
}

function FiltersTray() {
  const searchParams = Route.useSearch();
  const router = useRouter();

  const [query, setQuery] = useState(searchParams.q);

  return (
    <Tray>
      <TrayTrigger asChild>
        <Button variant="outline">
          Filters <FilterIcon className="size-4" />
        </Button>
      </TrayTrigger>
      <TrayContent>
        <TrayTitle>Filters</TrayTitle>
        <div className="flex flex-col items-start gap-3">
          <Input
            className="w-64"
            id="search"
            onChange={(evt) => setQuery(evt.target.value)}
            placeholder="Search users"
            value={query}
            tabIndex={undefined}
          />

          <div className="flex w-full justify-end gap-2">
            <TrayClose asChild>
              <Button
                variant="secondary"
                onClick={() => {
                  router.navigate({ to: "/posts", replace: true });
                }}
              >
                Reset
              </Button>
            </TrayClose>
            <TrayClose asChild>
              <Button
                onClick={() => {
                  router.navigate({
                    to: "/posts",
                    search: {
                      q: query,
                    },
                    replace: true,
                    resetScroll: true,
                  });
                }}
              >
                Apply
              </Button>
            </TrayClose>
          </div>
        </div>
      </TrayContent>
    </Tray>
  );
}
