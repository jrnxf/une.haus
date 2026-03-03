# Filtered List Pages

Filtered list pages use a two-layer pattern: **local state** for instant input feedback + **debounced `router.navigate`** for URL updates and data fetching.

## Why this pattern?

- `nuqs` with `shallow: false` triggers a TanStack Router navigation on every setter call, re-running `loaderDeps`, the async loader, and entering a pending state that disrupts the component tree
- `nuqs` with `shallow: true` avoids router navigation but still ties input value to URL serialization/deserialization on every keystroke
- `useState` gives instant feedback with zero overhead. The URL only needs to update after a debounce, which `useDebouncedCallback` + `navigate({ replace: true })` handles idiomatically through TanStack Router

## Data flow

```
Type → useState (instant) → debouncedNavigate (200ms) → URL updates
  → loaderDeps detects change → loader skips on "stay" (no blocking)
  → Route.useSearch() returns new params → useDeferredValue defers them
  → React keeps old UI visible until new data arrives
```

## Route definition

```tsx
import { useDebouncedCallback } from "@tanstack/react-pacer"

export const Route = createFileRoute("/items/")({
  validateSearch: items.list.schema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps, cause }) => {
    // Skip on "stay" — when the user is already on this route and
    // loaderDeps changed (i.e. filter input). The component's
    // useDeferredValue + Suspense boundary handle client-side transitions.
    // Only await on "enter" (navigation) and "preload" (hover intent)
    // so SSR has data on first paint.
    if (cause === "stay") return
    await context.queryClient.ensureInfiniteQueryData(
      items.list.infiniteQueryOptions(deps),
    )
  },
  component: RouteComponent,
})
```

Key points:

- `loaderDeps: ({ search }) => search` — loader re-runs only when URL search params change (which happens after the debounce)
- `cause === "stay"` — when the user is already on the route and deps change (filter input), skip the loader to avoid blocking rendering. The component handles the transition via `useDeferredValue` + `<Suspense>`
- `cause === "enter"` — navigating to the route (hard reload, link click). Loader awaits so SSR has data on first paint
- `cause === "preload"` — hover-intent preload. Loader awaits so data is ready on click

### Why skip the loader on "stay"?

When `loaderDeps` change, TanStack Router re-runs the async loader. If the loader `await`s, the router **blocks rendering** and unmounts the current component while the loader resolves. Since no `pendingComponent` is configured, this causes a blank page flash.

By returning early on `"stay"`, the router doesn't block. The component renders immediately, `useDeferredValue` keeps old search params so `useSuspenseInfiniteQuery` finds cached data, and React shows old results until new data arrives.

## Component pattern

The query that depends on filter params lives in a **child component** wrapped in `<Suspense>`. This keeps the filters visible and interactive even if the query suspends (e.g. on cold cache).

```tsx
function RouteComponent() {
  const searchParams = Route.useSearch()
  const navigate = Route.useNavigate()

  // 1. Local state for immediate input feedback
  const [query, setQuery] = useState(searchParams.q ?? "")
  const [tags, setTags] = useState<string[]>(searchParams.tags ?? [])

  // 2. Debounced navigate — updates URL (and loaderDeps) after wait period
  const debouncedNavigate = useDebouncedCallback(
    (updates: { q?: string; tags?: string[] }) => {
      navigate({
        search: {
          q: updates.q || undefined,
          tags:
            updates.tags && updates.tags.length > 0
              ? updates.tags
              : undefined,
        },
        replace: true,
      })
    },
    { wait: 200 },
  )

  // 3. useDeferredValue on URL search params — prevents suspense flash
  const deferredQ = useDeferredValue(searchParams.q)
  const deferredTags = useDeferredValue(searchParams.tags)

  // 4. Handlers update local state + trigger debounced navigate
  const handleChange = (newQ: string, newTags: string[]) => {
    setQuery(newQ)
    setTags(newTags)
    debouncedNavigate({ q: newQ, tags: newTags })
  }

  const queryParams = useMemo(
    () => ({
      q: deferredQ || undefined,
      tags:
        deferredTags && deferredTags.length > 0 ? deferredTags : undefined,
    }),
    [deferredQ, deferredTags],
  )

  return (
    <>
      <Filters ... />
      {/* Suspense boundary keeps filters visible during cold-cache loads */}
      <Suspense>
        <ItemsList queryParams={queryParams} />
      </Suspense>
    </>
  )
}

// 5. Child component with the suspense query
function ItemsList({ queryParams }: { queryParams: { q?: string; tags?: string[] } }) {
  const { data } = useSuspenseInfiniteQuery(
    items.list.infiniteQueryOptions(queryParams),
  )
  // render list...
}
```

## Why `useDeferredValue`?

When the debounced navigate fires, `Route.useSearch()` updates with new params. `useDeferredValue` defers these new params — React keeps rendering with old values (cache hit) while concurrently trying the new values. If new data isn't cached yet, React abandons the concurrent render and keeps showing old results instead of triggering Suspense.

The `<Suspense>` boundary is a safety net for cold loads (no cached data at all, e.g. first page load without SSR data).

## Client-side filtering variant (tricks)

When all data is loaded upfront and filtering is client-side, the pattern simplifies:

- No `loaderDeps` needed (loader doesn't depend on search params)
- No `useDeferredValue` needed (no suspense query for filtered results)
- No `cause` check needed (loader only runs on enter/preload)
- `searchParams.*` serve directly as the debounced filter values

```tsx
// searchParams update when debouncedNavigate fires = already debounced
const filteredItems = useMemo(() => {
  let result = data.items
  if (searchParams.q) {
    result = result.filter((item) => item.name.includes(searchParams.q!))
  }
  return result
}, [data.items, searchParams.q])
```

## Canonical examples

| Route     | Type                       | File                          |
| --------- | -------------------------- | ----------------------------- |
| `/users`  | Server-side infinite query | `src/routes/users/index.tsx`  |
| `/posts`  | Server-side infinite query | `src/routes/posts/index.tsx`  |
| `/vault`  | Server-side infinite query | `src/routes/vault/index.tsx`  |
| `/tricks` | Client-side filtering      | `src/routes/tricks/index.tsx` |
