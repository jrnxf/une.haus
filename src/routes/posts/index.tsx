import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { HeartIcon, MessageCircleIcon, PaperclipIcon } from "lucide-react";
import { useMemo } from "react";

import { useRouter } from "@tanstack/react-router";
import { FilterIcon } from "lucide-react";
import { useState } from "react";
import { TimeAgo } from "~/components/time-ago";
import {
  Tray,
  TrayClose,
  TrayContent,
  TrayTitle,
  TrayTrigger,
} from "~/components/tray";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { getMuxPoster } from "~/components/video-player";
import { WrappedBadges } from "~/components/wrapped-badges";
import { listPostsSchema } from "~/models/posts";
import { posts } from "~/lib/posts";

export const Route = createFileRoute("/posts/")({
  validateSearch: listPostsSchema,
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

  return (
    <div className="mx-auto flex w-full max-w-4xl grow flex-col gap-3 p-3">
      <div className="flex items-end justify-between gap-4">
        <Button asChild>
          <Link to="/posts/create">Create</Link>
        </Button>

        <div className="sticky top-3 z-10 self-end">
          <FiltersTray />
        </div>
      </div>
      {displayedPosts.length === 0 && (
        <p className="text-muted-foreground mt-1">No posts</p>
      )}
      {displayedPosts.map((post) => {
        const posterUrl =
          post.imageUrl ||
          (post.video?.playbackId && getMuxPoster(post.video.playbackId)) ||
          (post.youtubeVideoId &&
            `https://img.youtube.com/vi/${post.youtubeVideoId}/hqdefault.jpg`);

        return (
          <Link
            className="ring-offset-background focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
            key={post.id}
            params={{ postId: post.id }}
            to={`/posts/$postId`}
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

                <WrappedBadges content={post.tags} />

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

      {hasNextPage && (
        <Button onClick={() => fetchNextPage()}>
          {isFetchingNextPage ? "Loading..." : "Load more"}
        </Button>
      )}
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
