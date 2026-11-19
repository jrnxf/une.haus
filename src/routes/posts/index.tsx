import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { HeartIcon, MessageCircleIcon } from "lucide-react"
import { Suspense, useMemo } from "react"

import { Badges } from "~/components/badges"
import { ContentHeaderRow } from "~/components/content-header-row"
import { Filters, type FilterField } from "~/components/filters/filters"
import { InfiniteScrollTrigger } from "~/components/infinite-scroll-trigger"
import { NoResultsEmpty } from "~/components/no-results-empty"
import { PageHeader } from "~/components/page-header"
import { RichText } from "~/components/rich-text"
import { SuspenseLoader } from "~/components/suspense-loader"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import { StatBadge } from "~/components/ui/stat-badge"
import { POST_TAGS } from "~/db/schema"
import { useFilteredList } from "~/hooks/use-filtered-list"
import { getMuxPoster } from "~/lib/mux/poster"
import { posts } from "~/lib/posts"
import { seo } from "~/lib/seo"
import { getCloudflareImageUrl, setsEqual } from "~/lib/utils"

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
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-3 p-4 lg:grid-cols-12">
          <div className="grid min-w-0 grid-cols-1 gap-3 lg:col-span-8">
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
            <Suspense fallback={<SuspenseLoader />}>
              <PostsList
                queryParams={queryParams as { q?: string; tags?: string[] }}
                tagsOperator={operators.tags ?? "contain"}
              />
            </Suspense>
          </div>
          <TagRail active={searchParams.tags ?? []} />
        </div>
      </div>
    </>
  )
}

const railLink =
  "text-muted-foreground hover:bg-secondary hover:text-foreground data-active:bg-secondary data-active:text-foreground flex h-9 items-center rounded-xl px-3 text-sm transition-colors duration-150"

function TagRail({ active }: { active: string[] }) {
  return (
    <aside className="bg-card sticky top-16 hidden flex-col gap-1 rounded-3xl p-4 lg:col-span-4 lg:flex">
      <div className="text-muted-foreground px-3 pb-2 font-mono text-xs">
        tags
      </div>
      <Link
        to="/posts"
        className={railLink}
        data-active={active.length === 0 ? "true" : undefined}
      >
        all
      </Link>
      {POST_TAGS.map((tag) => (
        <Link
          key={tag}
          to="/posts"
          search={{ tags: [tag] }}
          className={railLink}
          data-active={active.includes(tag) ? "true" : undefined}
        >
          {tag}
        </Link>
      ))}
    </aside>
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

    return allPosts.filter((post) =>
      setsEqual(post.tags ?? [], queryParams.tags ?? []),
    )
  }, [postsPages, queryParams.tags, tagsOperator])

  return (
    <>
      {displayedPosts.length === 0 && <NoResultsEmpty />}
      {displayedPosts.map((post) => {
        const posterUrl =
          (post.imageId &&
            getCloudflareImageUrl(post.imageId, { width: 400, quality: 70 })) ||
          (post.video?.playbackId &&
            getMuxPoster({ playbackId: post.video.playbackId, width: 400 })) ||
          (post.youtubeVideoId &&
            `https://img.youtube.com/vi/${post.youtubeVideoId}/mqdefault.jpg`)
        return (
          <Link
            data-testid="post-card"
            key={post.id}
            to="/posts/$postId"
            params={{ postId: post.id }}
            className="bg-card hover:bg-card-2 flex min-w-0 flex-col gap-4 rounded-3xl p-5 transition-colors duration-150"
          >
            <div className="flex items-center gap-2 text-sm">
              <Avatar
                className="size-6"
                cloudflareId={post.user.avatarId}
                alt={post.user.name}
              >
                <AvatarImage width={48} quality={70} />
                <AvatarFallback name={post.user.name} />
              </Avatar>
              <span className="truncate font-medium">{post.user.name}</span>
              <RelativeTimeCard date={post.createdAt} variant="muted" />
            </div>
            <div className="flex items-start gap-5">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <h3 className="font-mono text-lg leading-tight font-medium">
                  {post.title}
                </h3>
                <div className="text-muted-foreground line-clamp-3 text-sm">
                  <RichText content={post.content} mentionMode="plainText" />
                </div>
              </div>
              {Boolean(posterUrl) && (
                <img
                  src={posterUrl || undefined}
                  alt=""
                  loading="lazy"
                  className="bg-secondary aspect-video w-28 shrink-0 rounded-xl object-cover sm:w-44"
                />
              )}
            </div>
            <div className="flex w-full items-center justify-between gap-4">
              <Badges content={post.tags} active={queryParams.tags ?? []} />
              <div className="text-muted-foreground ml-auto flex items-center gap-2 text-xs">
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
          </Link>
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
