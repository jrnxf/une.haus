import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { HeartIcon, MessageCircleIcon, PaperclipIcon } from "lucide-react"
import { Suspense, useMemo } from "react"

import { Badges } from "~/components/badges"
import { ContentHeaderRow } from "~/components/content-header-row"
import { Filters, type FilterField } from "~/components/filters/filters"
import { InfiniteScrollTrigger } from "~/components/infinite-scroll-trigger"
import { NoResultsEmpty } from "~/components/no-results-empty"
import { PageHeader } from "~/components/page-header"
import { RichText } from "~/components/rich-text"
import { Button } from "~/components/ui/button"
import { Metaline } from "~/components/ui/metaline"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import { StatBadge } from "~/components/ui/stat-badge"
import { getMuxPoster } from "~/components/video-player"
import { POST_TAGS } from "~/db/schema"
import { useFilteredList } from "~/hooks/use-filtered-list"
import { posts } from "~/lib/posts"
import { seo } from "~/lib/seo"

export const Route = createFileRoute("/posts/")({
  validateSearch: posts.list.schema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps, cause }) => {
    // Skip on "stay" (filter changed on same page) — awaiting here blocks
    // rendering and causes a blank page. useDeferredValue + Suspense in
    // the component handle client-side transitions instead.
    if (cause === "stay") return
    await context.queryClient.ensureInfiniteQueryData(
      posts.list.infiniteQueryOptions(deps),
    )
  },
  head: () =>
    seo({
      title: "posts",
      description: "community posts on une.haus",
      path: "/posts",
    }),
  component: RouteComponent,
})

const filterFields: FilterField[] = [
  {
    key: "q",
    label: "search",
    type: "text" as const,
    placeholder: "search...",
    operators: [{ value: "contains", label: "contains" }],
    defaultOperator: "contains",
  },
  {
    key: "tags",
    label: "tags",
    type: "multiselect" as const,
    operators: [
      { value: "contain", label: "contain" },
      { value: "equal", label: "equal" },
    ],
    defaultOperator: "contain",
    options: POST_TAGS.map((t) => ({ value: t, label: t })),
  },
]

function RouteComponent() {
  const searchParams = Route.useSearch()
  const navigate = Route.useNavigate()

  const { filters, handleFiltersChange, queryParams, operators } =
    useFilteredList({
      fields: filterFields,
      searchParams,
      navigate,
    })

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>posts</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="h-full overflow-y-auto">
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 p-4">
          <ContentHeaderRow
            className="max-w-none"
            left={
              <Filters
                fields={filterFields}
                filters={filters}
                onFiltersChange={handleFiltersChange}
              />
            }
            right={
              <Button asChild>
                <Link to="/posts/create">create</Link>
              </Button>
            }
          />
          <Suspense>
            <PostsList
              queryParams={queryParams as { q?: string; tags?: string[] }}
              tagsOperator={operators.tags ?? "contain"}
            />
          </Suspense>
        </div>
      </div>
    </>
  )
}

function PostsList({
  queryParams,
  tagsOperator,
}: {
  queryParams: { q?: string; tags?: string[] }
  tagsOperator: "contain" | "equal"
}) {
  const {
    data: postsPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSuspenseInfiniteQuery(posts.list.infiniteQueryOptions(queryParams))

  const displayedPosts = useMemo(() => {
    const allPosts = postsPages.pages.flat()
    if (
      tagsOperator !== "equal" ||
      !queryParams.tags ||
      queryParams.tags.length === 0
    ) {
      return allPosts
    }

    const filterSet = new Set(queryParams.tags.map(String))

    return allPosts.filter((post) => {
      const postSet = new Set((post.tags ?? []).map(String))
      if (postSet.size !== filterSet.size) return false
      for (const tag of filterSet) {
        if (!postSet.has(tag)) return false
      }
      return true
    })
  }, [postsPages, queryParams.tags, tagsOperator])

  return (
    <>
      {displayedPosts.length === 0 && <NoResultsEmpty />}
      {displayedPosts.map((post) => {
        const posterUrl =
          post.imageId ||
          (post.video?.playbackId &&
            getMuxPoster({ playbackId: post.video.playbackId })) ||
          (post.youtubeVideoId &&
            `https://img.youtube.com/vi/${post.youtubeVideoId}/hqdefault.jpg`)
        return (
          <div data-testid="post-card" key={post.id} className="relative">
            <Button
              variant="card"
              asChild
              className="flex flex-col gap-4 p-3 sm:flex-row"
            >
              <Link to="/posts/$postId" params={{ postId: post.id }}>
                <div className="flex w-full flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {Boolean(posterUrl) && (
                      <PaperclipIcon className="text-muted-foreground inline size-3" />
                    )}
                    <span className="truncate font-semibold">{post.title}</span>
                  </div>
                  <div className="text-muted-foreground line-clamp-3 text-sm">
                    <RichText content={post.content} mentionMode="plainText" />
                  </div>
                  <Badges content={post.tags} active={queryParams.tags ?? []} />
                  <div className="flex w-full justify-between gap-4">
                    <Metaline
                      className="inline-flex items-center gap-1.5 text-xs"
                      parts={[
                        <span key="author" className="text-foreground/50">
                          {post.user.name}
                        </span>,
                        <RelativeTimeCard
                          key="time"
                          date={post.createdAt}
                          variant="muted"
                        />,
                      ]}
                    />
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <StatBadge
                        icon={HeartIcon}
                        count={post.counts.likes}
                        label="like"
                      />
                      <StatBadge
                        icon={MessageCircleIcon}
                        count={post.counts.messages}
                        label="message"
                      />
                    </div>
                  </div>
                </div>
              </Link>
            </Button>
          </div>
        )
      })}
      <InfiniteScrollTrigger
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </>
  )
}
