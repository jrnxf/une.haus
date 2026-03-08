# Project Guidelines

## TypeScript Style

- Always use `type` instead of `interface` for type definitions
- Avoid `useEffect` - prefer derived state, event handlers, or keying components
- Never use non-null assertions (`!.`) - use safe alternatives like optional chaining with fallbacks, type narrowing, or early returns

## Library Organization (`src/lib/`)

Each feature domain follows a consistent structure:

```
src/lib/{domain}/
├── fns.ts      # Server functions using createServerFn() from TanStack Start
├── schemas.ts  # Zod schemas for input validation
├── hooks.ts    # React Query mutation hooks (optional)
└── index.ts    # Barrel export as facade object
```

The `index.ts` exports a facade object organizing all operations:

```ts
export const messages = {
  list: { fn: listMessagesServerFn, schema: listMessagesSchema, queryOptions: (data) => ... },
  create: { fn: createMessageServerFn, schema: createMessageSchema },
  // ...
};
```

## Fast Refresh Compatibility

Never mix React component exports and non-component exports (hooks, constants, contexts) in the same file. Vite's Fast Refresh requires a module to export **only** components or **only** non-components. Put hooks and contexts in a separate `-context.tsx` file.

```ts
// Good - components-only file
export function MobileNavProvider({ children }: { children: ReactNode }) { ... }
export function MobileNavTrigger() { ... }

// Good - separate file for hooks/context
// mobile-nav-context.tsx
export const MobileNavContext = createContext<(() => void) | null>(null);
export function useMobileNav() { ... }

// Bad - mixing hooks and components in one file breaks Fast Refresh
export function useMobileNav() { ... }
export function MobileNavProvider() { ... }
```

## Component Organization

Components are organized in domain-specific folders. **Do NOT use barrel files (`index.ts`) in `src/components/`** - always use direct imports:

```ts
// Good - direct imports

// Bad - barrel imports (do not use)
import { StatCard } from "~/components/stats"
import { ActivityChart } from "~/components/stats/activity-chart"
import { StatCard } from "~/components/stats/stat-card"
```

## Query Key Hierarchy

Query keys follow a dot-notation hierarchy matching the domain structure:

- `["stats.get"]` - Top-level stats
- `["games.rius.active.list"]` - Active RIU games
- `["games.rius.sets.get", data]` - Individual set with params
- `["messages", data]` - Messages with parent type/ID in data

## Database Schema Patterns

Engagement tables follow a consistent pattern for each entity:

- `{entity}Likes` - Composite primary key: `entityId + userId`
- `{entity}Messages` - Comments on the entity
- `{entity}MessageLikes` - Likes on comments

### Message Likes Column Naming

**CRITICAL**: When creating a `{entity}MessageLikes` table, the foreign key column must follow this exact pattern:

```ts
// Good - column name matches the type pattern
export const fooMessageLikes = pgTable("foo_message_likes", {
  fooMessageId: integer("foo_message_id")  // Column name = {type}Id
    .notNull()
    .references(() => fooMessages.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.fooMessageId, t.userId] })]);

// Bad - generic column name breaks the reactions system
export const fooMessageLikes = pgTable("foo_message_likes", {
  messageId: integer("message_id")  // WRONG: must be fooMessageId
    ...
});
```

The reactions system (`src/lib/reactions/fns.ts`) dynamically constructs column names using `` `${type}Id` ``. For `fooMessage` type, it expects `fooMessageId`. A mismatch causes likes to silently fail.

## Route Pattern

Routes use a loader + suspense pattern:

```ts
// Loader pre-fetches data
loader: ({ context }) =>
  context.queryClient.ensureQueryData(domain.get.queryOptions())

// Component uses same query options
const { data } = useSuspenseQuery(domain.get.queryOptions())
```

### Loaders Must Await Data for SSR

**CRITICAL**: Route loaders must `await` data fetches for SSR to work. Without `await`, the server renders before data arrives, causing a loading flash instead of SSR content.

**Always use `ensure*` methods, never `prefetch*`:**

- `ensureQueryData` - for regular queries
- `ensureInfiniteQueryData` - for infinite/paginated queries

```ts
// Good - awaited ensure, SSR works
loader: async ({ context }) => {
  await context.queryClient.ensureQueryData(domain.get.queryOptions());
},

// Good - awaited ensure for infinite queries
loader: async ({ context, deps }) => {
  await context.queryClient.ensureInfiniteQueryData(
    domain.list.infiniteQueryOptions(deps),
  );
},

// Bad - prefetch doesn't guarantee data is ready
loader: ({ context }) => {
  context.queryClient.prefetchQuery(domain.get.queryOptions());
},
```

### Filtered Lists with Suspense

For pages with search/filter inputs that use `useSuspenseInfiniteQuery`, filter state uses **local React state** for instant feedback + **debounced `navigate({ replace: true })`** via TanStack Pacer to update the URL idiomatically through TanStack Router.

**Full docs:** `docs/filtering.md`

**Canonical examples:**

- `src/routes/users/index.tsx` — `<Filters>` component with text + multiselect
- `src/routes/posts/index.tsx` — `<Filters>` component with text + multiselect
- `src/routes/vault/index.tsx` — `<Filters>` component with text + multiselect
- `src/routes/tricks/index.tsx` — client-side filtering variant (no `loaderDeps`)

**The pattern has four layers:**

1. **`useState`** — local state for immediate input feedback (initialized from `Route.useSearch()`)
2. **`useDebouncedCallback`** (from `@tanstack/react-pacer`) — debounces `Route.useNavigate()` calls so the URL and `loaderDeps` only update after a wait period
3. **`useDeferredValue`** — wraps URL search params to prevent suspense flash
4. **`<Suspense>` boundary** — wraps the child component that uses `useSuspenseInfiniteQuery`, keeping filters visible during cold-cache loads

**Loader uses `cause` to avoid blocking on filter changes:**

```tsx
import { useDebouncedCallback } from "@tanstack/react-pacer"

export const Route = createFileRoute("/items/")({
  validateSearch: items.list.schema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps, cause }) => {
    // "stay" = filter changed on same page — skip to avoid blocking rendering.
    // useDeferredValue + Suspense boundary handle client-side transitions.
    if (cause === "stay") return
    // "enter" / "preload" = navigation or hover intent — await for SSR
    await context.queryClient.ensureInfiniteQueryData(
      items.list.infiniteQueryOptions(deps),
    )
  },
  component: RouteComponent,
})

function RouteComponent() {
  const searchParams = Route.useSearch()
  const navigate = Route.useNavigate()

  // Local state for immediate feedback — NOT nuqs
  const [query, setQuery] = useState(searchParams.q ?? "")
  const [tags, setTags] = useState<string[]>(searchParams.tags ?? [])

  // Debounced navigate — updates URL (and loaderDeps) after wait period
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

  // useDeferredValue on URL search params — prevents suspense flash
  const deferredQ = useDeferredValue(searchParams.q)
  const deferredTags = useDeferredValue(searchParams.tags)

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
      <Suspense>
        <ItemsList queryParams={queryParams} />
      </Suspense>
    </>
  )
}

// Child component — Suspense boundary keeps filters visible during load
function ItemsList({ queryParams }: { queryParams: { q?: string; tags?: string[] } }) {
  const { data } = useSuspenseInfiniteQuery(
    domain.list.infiniteQueryOptions(queryParams),
  )
  // render list...
}
```

**Why local state, not nuqs?**

- nuqs with `shallow: false` triggers a TanStack Router navigation on every setter call — re-running `loaderDeps`, the async loader, and entering a pending state that disrupts the component tree (especially deep component trees like the `<Filters>` chip bar)
- nuqs with `shallow: true` avoids router navigation but still ties input value to URL serialization/deserialization on every keystroke, adding unnecessary overhead
- Plain `useState` gives instant feedback with zero overhead. The URL only needs to update after debounce, which `useDebouncedCallback` + `navigate({ replace: true })` handles idiomatically through TanStack Router

**Do NOT use nuqs `useQueryState` for text inputs on filtered list pages.** It causes page reloads / UI disruption because every keystroke either triggers a router navigation (`shallow: false`) or unnecessary URL serialization (`shallow: true`).

## Page Header System

Every route renders a `<PageHeader>` compound component that displays the sticky header bar with sidebar trigger, breadcrumbs, tabs, actions, and search. All header content is declared as JSX children — no external stores, context, or `staticData`.

**Key file:** `src/components/page-header.tsx`

### Usage

```tsx
// Minimal — just sidebar trigger + search
<PageHeader />

// With breadcrumbs
<PageHeader>
  <PageHeader.Breadcrumbs>
    <PageHeader.Crumb to="/tricks">tricks</PageHeader.Crumb>
    <PageHeader.Crumb>{trick.name}</PageHeader.Crumb>
  </PageHeader.Breadcrumbs>
</PageHeader>

// With breadcrumbs and right-aligned actions
<PageHeader>
  <PageHeader.Breadcrumbs>
    <PageHeader.Crumb>tricks</PageHeader.Crumb>
  </PageHeader.Breadcrumbs>
  <PageHeader.Right>
    <PageHeader.Actions>
      <Button asChild><Link to="/tricks/create">Create</Link></Button>
    </PageHeader.Actions>
  </PageHeader.Right>
</PageHeader>

// With breadcrumbs, tabs, and actions
<PageHeader>
  <PageHeader.Breadcrumbs>
    <PageHeader.Crumb>tricks</PageHeader.Crumb>
  </PageHeader.Breadcrumbs>
  <PageHeader.Right>
    <PageHeader.Tabs>
      <PageHeader.Tab to="/tricks">list</PageHeader.Tab>
      <PageHeader.Tab to="/tricks/graph">graph</PageHeader.Tab>
    </PageHeader.Tabs>
    <PageHeader.Actions>
      <Button asChild><Link to="/tricks/create">Create</Link></Button>
    </PageHeader.Actions>
  </PageHeader.Right>
</PageHeader>
```

### Compound Component API

- `<PageHeader.Breadcrumbs>` — wrapper for crumbs (includes divider after sidebar trigger)
- `<PageHeader.Crumb to="/path">label</PageHeader.Crumb>` — link crumb (has `to`) or current page (no `to`)
- `<PageHeader.Crumb icon={Icon}>label</PageHeader.Crumb>` — optional icon
- `<PageHeader.Right>` — right-aligned container (`ml-auto`), wraps tabs and/or actions
- `<PageHeader.Tabs>` — wrapper for tab links
- `<PageHeader.Tab to="/path" icon={Icon}>label</PageHeader.Tab>` — tab link, active state derived from `useLocation()`
- `<PageHeader.Actions>` — fragment wrapper for action buttons

### Breadcrumb Depth

| Route Type                       | Breadcrumbs        | Example                      |
| -------------------------------- | ------------------ | ---------------------------- |
| Standalone (home, shop, privacy) | None               | Minimal header               |
| Hub pages (`/games`, `/vault`)   | 1 crumb (non-link) | `games`                      |
| Sub-sections (`/tricks/create`)  | 2 crumbs           | `tricks > create`            |
| Detail pages (`/vault/$videoId`) | 2 crumbs           | `vault > video title`        |
| Deep detail (`/vault/$id/edit`)  | 3 crumbs           | `vault > video title > edit` |

### Rules

- Every route must render `<PageHeader>` (provides sidebar trigger + search)
- The last `<PageHeader.Crumb>` (without `to` prop) represents the current page
- Layout routes render `<PageHeader>` with breadcrumbs; child routes inside layouts do NOT render their own `<PageHeader>` (avoids duplicate headers)
- Reach for pathless browse layouts when a section has shared navigation chrome for list/browse pages but detail pages should start directly with their own content. Example: `/games/*/route.tsx` renders the shared breadcrumb header, while `/games/*/_browse.tsx` owns browse-only controls like active/archived tabs, game selectors, and archive pickers.
- Do not put browse-only controls in the top-level game layout if set/submission/detail routes live under the same URL subtree. Detail routes should inherit the shared breadcrumb shell, not the browse controls.
- Dynamic breadcrumb labels use query data directly: `<PageHeader.Crumb>{trick.name}</PageHeader.Crumb>`

## Peripherals (URL-driven open/close)

The `usePeripherals(key)` hook (`src/hooks/use-peripherals.ts`) manages open/close state via the `?p=` URL param. Opening pushes a history entry; closing calls `history.back()` to pop it (enabling iOS swipe-back).

### Never use close wrappers with navigation links

When a peripheral contains navigation links, do **NOT** wrap them in a close trigger (e.g., `DrawerPrimitive.Close`, `SheetClose`). The close trigger calls `history.back()`, which undoes the navigation.

Instead, use plain `Link` components. When the link navigates to a new URL, the `?p=` param is gone, so `usePeripherals` returns `open=false` and the peripheral closes naturally.

```tsx
// Good - Link navigates, URL change closes the drawer
<Link to={url}>Go somewhere</Link>

// Bad - DrawerPrimitive.Close calls history.back(), undoing the navigation
<DrawerPrimitive.Close render={<Link to={url} />}>
  Go somewhere
</DrawerPrimitive.Close>
```

## Session & Authentication

This project uses TanStack Router with TanStack Query (react-query) for data fetching.

### Session Invalidation Pattern

When auth state changes (login/logout), use `queryClient.resetQueries()` to clear the session cache:

```ts
await queryClient.resetQueries({ queryKey: ["session.get"] })
navigate({ to: "/destination" })
```

**Why `resetQueries` instead of `invalidateQueries`?**

- Route loaders use `ensureQueryData()` which returns cached data immediately, even if stale
- `invalidateQueries` only marks data as stale but keeps it in cache
- `resetQueries` clears the cache entirely, forcing `ensureQueryData` to fetch fresh data

**Why no `router.invalidate()`?**

- Since all data fetching goes through react-query, resetting the query cache is sufficient
- Navigation triggers route loaders, which call `ensureQueryData`, which fetches fresh data when cache is empty
- `router.invalidate()` would only be needed for route loaders that fetch outside of react-query

## Cache Invalidation After Mutations

There are two patterns depending on whether you stay on the same page or navigate away:

### Pattern 1: Optimistic Updates (staying on same page)

**Canonical example: `src/routes/_authed/posts/$postId/edit.tsx`**

When a mutation modifies data and the user stays on the same page, use optimistic updates for immediate UI feedback:

```ts
const listQueryKey = domain.list.queryOptions({ status: "pending" }).queryKey

const mutation = useMutation({
  mutationFn: domain.review.fn,
  onMutate: async ({ data: { id } }) => {
    // Cancel in-flight queries
    await qc.cancelQueries({ queryKey: listQueryKey })

    // Get previous data for rollback
    const prev = qc.getQueryData(listQueryKey)

    // Optimistically update (e.g., remove item from list)
    qc.setQueryData(listQueryKey, (old) =>
      old?.filter((item) => item.id !== id),
    )

    return { prev }
  },
  onSuccess: () => {
    // Remove other affected queries for when user navigates later
    qc.removeQueries({ queryKey: otherDomain.graph.queryOptions().queryKey })
    toast.success("Done")
  },
  onError: (error, _, context) => {
    // Rollback on error
    if (context?.prev) {
      qc.setQueryData(listQueryKey, context.prev)
    }
    toast.error(error.message)
  },
  onSettled: () => {
    // Ensure data consistency
    qc.invalidateQueries({ queryKey: listQueryKey })
  },
})
```

### Pattern 2: Remove + Navigate (navigating to different page)

**Canonical example: `src/lib/games/rius/hooks.ts` - `useCreateSet()`**

When a mutation completes and navigates to a page that displays affected data, use `removeQueries` before navigating:

```ts
const mutation = useMutation({
  mutationFn: domain.create.fn,
  onMutate: () => {
    qc.cancelQueries({ queryKey: listQueryKey })
  },
  onSuccess: () => {
    toast.success("Created")
    // Remove queries so loader fetches fresh data on navigation
    qc.removeQueries({ queryKey: listQueryKey })
    navigate({ to: "/destination" })
  },
})
```

### Why these patterns?

- `invalidateQueries` marks queries as stale but keeps cached data - **causes flash of stale content**
- `refetchQueries` refetches in background but stale data may render first - **causes flash**
- `removeQueries` clears the cache - route loader's `ensureQueryData` fetches fresh data since cache is empty - **no flash**
- Optimistic updates update the cache immediately - **no flash, instant feedback**
- See: https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5#hydration-api-changes

### Always use exact query keys from queryOptions

```ts
// Good - use the queryOptions helper to get the exact key
qc.removeQueries({
  queryKey: tricks.submissions.list.queryOptions({ status: "pending" })
    .queryKey,
})

// Bad - manually constructing keys can drift from actual keys
qc.removeQueries({ queryKey: ["tricks.submissions.list"] })
```

## UI Guidelines

### Routes Must Be Navigable

When creating a new route, always ensure there's a way to navigate to it from the existing UI. Add buttons, links, or menu items so users can reach the new page by clicking around. Never create orphan routes.

### Button Labels

- Use single-word labels: "Create", "Save", "Delete", "Edit"
- Do NOT add icons to buttons unless explicitly requested
- Do NOT use multi-word labels like "Add Element" or "Create Thing"

```tsx
// Good
<Button asChild>
  <Link to="/elements/create">Create</Link>
</Button>

// Bad - multi-word label
<Button>Add Element</Button>

// Bad - icon without being asked
<Button>
  <Plus className="size-4" />
  Create
</Button>
```

### Button Sizing

Primary action buttons use **default size** - not `size="sm"`:

- Use default button size for primary page actions (filters, create, etc.)
- Reserve `size="sm"` for inline/secondary contexts (back navigation, compact toolbars)

### Forms

- Forms should be on their own dedicated route/page
- Do NOT put forms in dialogs unless explicitly requested
- Create separate `/create` or `/edit` routes for form pages

### Admin Buttons

Admin functionality should use a consistent UI pattern: a secondary icon button with the Shield icon.

```tsx
import { ShieldIcon } from "lucide-react";

// For admin dropdown menus
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="secondary" size="icon">
      <ShieldIcon className="size-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    {/* Admin actions */}
  </DropdownMenuContent>
</DropdownMenu>

// For admin toggle buttons
<Button
  variant={adminMode ? "default" : "secondary"}
  size="icon-xs"
  onClick={() => setAdminMode(!adminMode)}
>
  <ShieldIcon className="size-3.5" />
</Button>
```

Canonical examples:

- `src/routes/vault/index.tsx` - Admin mode toggle
- `src/routes/games/rius/_browse.tsx` - Browse-only game navigation
- `src/routes/tricks/index.tsx` - Admin dropdown menu

## Spacing Guidelines

Use consistent Tailwind spacing utilities throughout the codebase. Avoid non-standard values.

### Flex/Grid Gaps

Use these standard gap values:

- `gap-1` - Tight spacing (icons, small button groups)
- `gap-2` - Default for most flex/grid layouts
- `gap-3` - Intermediate spacing
- `gap-4` - Medium spacing (card content, form sections)
- `gap-6` - Large spacing (section separation)

**Avoid:** `gap-5`, `gap-7`, `gap-8+`, fractional gaps (`gap-1.5`, `gap-2.5`)

### Vertical Stacking (space-y)

- `space-y-1` - Tight (error messages, compact lists)
- `space-y-2` - Default (form fields, list items)
- `space-y-3` - Intermediate spacing
- `space-y-4` - Medium (content sections)
- `space-y-6` - Large (page sections)

**Avoid:** `space-y-5`, `space-y-7`, `space-y-8+`

### Container Padding

- `p-4` - Compact containers, mobile
- `p-6` - Cards, dialogs, modals

**Avoid:** `p-3`, `p-5`, `p-7`

### Page Containers

Standard pattern for route content:

```tsx
<div className="mx-auto w-full max-w-4xl p-4 md:p-6">{/* content */}</div>
```

For narrow forms: `max-w-lg`

### CardHeader/CardContent

- CardHeader: Use `pb-2` for standard spacing
- CardContent: Use default `px-6` (don't override with `px-4`)

### Message Sections

Use `gap-4` in flex containers instead of manual margins (`mt-3`, `mb-1`):

```tsx
// Good - gap in flex container
<div className="flex flex-col gap-4">
  {messages.map((m) => <Message key={m.id} />)}
</div>

// Bad - manual margins
<div className={cn("mb-1", index !== 0 && "mt-3")}>
```

### Summary Table

| Context            | Standard Values                                                 | Avoid                                          |
| ------------------ | --------------------------------------------------------------- | ---------------------------------------------- |
| Flex gaps          | `gap-1`, `gap-2`, `gap-3`, `gap-4`, `gap-6`                     | `gap-5`, `gap-7+`, fractional (`gap-1.5`, etc) |
| Vertical stacking  | `space-y-1`, `space-y-2`, `space-y-3`, `space-y-4`, `space-y-6` | `space-y-5`, `space-y-7+`                      |
| Padding            | `p-4`, `p-6`                                                    | `p-3`, `p-5`, `p-7`                            |
| Horizontal padding | `px-2`, `px-4`, `px-6`                                          | `px-3`, `px-5`                                 |
| Vertical padding   | `py-1`, `py-2`, `py-4`, `py-6`                                  | `py-3`, `py-5`                                 |

## E2E Testing

- **Never use CSS class selectors** (`.bg-card`, `.text-white`, etc.) in Playwright locators
- Always use a11y selectors: `getByRole`, `getByLabel`, `getByPlaceholder`, `getByText`
- Use `data-testid` as a last resort when no semantic selector exists
- If a component lacks a11y attributes needed for testing, add them to the component first
- Import `{ test, expect }` from `"../fixtures"` (auto-waits for hydration)
- Use `page.waitForLoadState("networkidle")` after navigation for interactive pages
- **Tests must clean up after themselves.** Any data created during a test (posts, messages, likes) must be deleted in `afterAll`. Use direct SQL via `postgres` (same pattern as `e2e/auth.setup.ts`) to delete test data. Prefix test content with `e2e-` so cleanup queries can target it with `LIKE 'e2e-%'`. Foreign key cascades handle dependent rows (e.g., deleting a message cascades its likes).

## Documentation

When modifying code that has associated documentation in `docs/`, always update the docs to reflect changes. Keep documentation in sync with implementation.
