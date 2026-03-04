import { useDebouncedCallback } from "@tanstack/react-pacer"
import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { HeartIcon, MessageCircleIcon, PaperclipIcon } from "lucide-react"
import {
  Suspense,
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from "react"
import { InView } from "react-intersection-observer"

import { Badges } from "~/components/badges"
import {
  Filters,
  type ActiveFilter,
  type FilterField,
} from "~/components/filters/filters"
import { NoResultsEmpty } from "~/components/no-results-empty"
import { PageHeader } from "~/components/page-header"
import { RichText } from "~/components/rich-text"
import { Button } from "~/components/ui/button"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import { getMuxPoster } from "~/components/video-player"
import { POST_TAGS } from "~/db/schema"
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

function RouteComponent() {
  const searchParams = Route.useSearch()
  const navigate = Route.useNavigate()

  // Local state for immediate input feedback
  const [queryInput, setQueryInput] = useState(searchParams.q ?? "")
  const [tags, setTags] = useState<string[]>(searchParams.tags ?? [])

  // Debounced navigate — updates URL (and loaderDeps) after wait period
  const debouncedNavigate = useDebouncedCallback(
    (updates: { q?: string; tags?: string[] }) => {
      navigate({
        search: {
          q: updates.q || undefined,
          tags:
            updates.tags && updates.tags.length > 0 ? updates.tags : undefined,
        },
        replace: true,
      })
    },
    { wait: 200 },
  )

  // useDeferredValue on URL search params — prevents suspense flash
  const deferredQ = useDeferredValue(searchParams.q)
  const deferredTags = useDeferredValue(searchParams.tags)

  // Track which filter fields are open (text filters can be open with empty value)
  const [activeFields, setActiveFields] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    if (queryInput) initial.add("q")
    if (tags.length > 0) initial.add("tags")
    return initial
  })

  const filterFields: FilterField[] = useMemo(
    () => [
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
        operators: [{ value: "is_any_of", label: "includes" }],
        defaultOperator: "is_any_of",
        options: POST_TAGS.map((t) => ({ value: t, label: t })),
      },
    ],
    [],
  )

  // Derive filters from LOCAL state (immediate feedback, not URL)
  const filters = useMemo<ActiveFilter[]>(() => {
    const result: ActiveFilter[] = []
    if (activeFields.has("q")) {
      result.push({
        id: "q",
        field: "q",
        operator: "contains",
        values: queryInput ? [queryInput] : [],
      })
    }
    if (activeFields.has("tags") || tags.length > 0) {
      result.push({
        id: "tags",
        field: "tags",
        operator: "is_any_of",
        values: tags,
      })
    }
    return result
  }, [queryInput, tags, activeFields])

  const handleFiltersChange = useCallback(
    (next: ActiveFilter[]) => {
      const qFilter = next.find((f) => f.field === "q")
      const tagsFilter = next.find((f) => f.field === "tags")

      setActiveFields((prev) => {
        const wantQ = Boolean(qFilter)
        const wantTags = Boolean(tagsFilter)
        if (prev.has("q") === wantQ && prev.has("tags") === wantTags) {
          return prev
        }
        const s = new Set<string>()
        if (wantQ) s.add("q")
        if (wantTags) s.add("tags")
        return s
      })

      const newQ = qFilter?.values[0] || ""
      const newTags =
        tagsFilter && tagsFilter.values.length > 0 ? tagsFilter.values : []

      // Update local state immediately for instant feedback
      setQueryInput(newQ)
      setTags(newTags)

      // Debounced URL update via router
      debouncedNavigate({ q: newQ, tags: newTags })
    },
    [debouncedNavigate],
  )

  const queryParams = useMemo(
    () => ({
      q: deferredQ || undefined,
      tags: deferredTags && deferredTags.length > 0 ? deferredTags : undefined,
    }),
    [deferredQ, deferredTags],
  )

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>posts</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Right>
          <PageHeader.Actions>
            <Button asChild>
              <Link to="/posts/create">create</Link>
            </Button>
          </PageHeader.Actions>
        </PageHeader.Right>
      </PageHeader>

      <div className="h-full overflow-y-auto">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 p-4">
          <Filters
            fields={filterFields}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            size="sm"
          />
          <Suspense>
            <PostsList queryParams={queryParams} deferredTags={deferredTags} />
          </Suspense>
        </div>
      </div>
    </>
  )
}

function PostsList({
  queryParams,
  deferredTags,
}: {
  queryParams: { q?: string; tags?: string[] }
  deferredTags: string[] | undefined
}) {
  const {
    data: postsPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSuspenseInfiniteQuery(posts.list.infiniteQueryOptions(queryParams))

  const displayedPosts = useMemo(() => postsPages.pages.flat(), [postsPages])

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
            <div className="bg-card flex flex-col gap-4 rounded-md border p-3 sm:flex-row">
              <div className="flex w-full flex-col gap-2">
                <Link
                  to="/posts/$postId"
                  params={{ postId: post.id }}
                  className="w-fit truncate font-semibold after:absolute after:inset-0 after:rounded-md"
                >
                  {Boolean(posterUrl) && (
                    <PaperclipIcon className="text-muted-foreground mr-2 inline size-3" />
                  )}
                  {post.title}
                </Link>
                <div className="relative z-10 line-clamp-3 text-sm">
                  <RichText content={post.content} />
                </div>
                <Badges content={post.tags} active={deferredTags ?? []} />
                <div className="flex w-full justify-between gap-4">
                  <p className="text-muted-foreground relative z-10 inline-flex items-center gap-1.5 text-sm">
                    <Link
                      to="/users/$userId"
                      params={{ userId: post.user.id }}
                      className="hover:underline"
                    >
                      {post.user.name}
                    </Link>
                    <span className="opacity-25">/</span>
                    <RelativeTimeCard date={post.createdAt} variant="muted" />
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
          </div>
        )
      })}
      {hasNextPage && !isFetchingNextPage && (
        <InView
          rootMargin="1000px"
          onChange={(inView) => inView && fetchNextPage()}
        />
      )}
    </>
  )
}
