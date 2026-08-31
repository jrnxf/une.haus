import { InView } from "react-intersection-observer"

type InfiniteScrollTriggerProps = {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  rootMargin?: string
  root?: Element | null
}

export function InfiniteScrollTrigger({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = "1000px",
  root,
}: InfiniteScrollTriggerProps) {
  if (!hasNextPage || isFetchingNextPage) return null

  return (
    <InView
      root={root}
      rootMargin={rootMargin}
      onChange={(inView) => inView && fetchNextPage()}
    />
  )
}
