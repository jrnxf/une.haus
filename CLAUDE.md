# Project Guidelines

## TypeScript Style

- Always use `type` instead of `interface` for type definitions
- Avoid `useEffect` - prefer derived state, event handlers, or keying components

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

## Component Organization

Components are organized in domain-specific folders. **Do NOT use barrel files (`index.ts`) in `src/components/`** - always use direct imports:

```ts
// Good - direct imports

// Bad - barrel imports (do not use)
import { StatCard } from "~/components/stats";
import { ActivityChart } from "~/components/stats/activity-chart";
import { StatCard } from "~/components/stats/stat-card";
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

## Route Pattern

Routes use a loader + suspense pattern:

```ts
// Loader pre-fetches data
loader: ({ context }) =>
  context.queryClient.ensureQueryData(domain.get.queryOptions());

// Component uses same query options
const { data } = useSuspenseQuery(domain.get.queryOptions());
```

## Session & Authentication

This project uses TanStack Router with TanStack Query (react-query) for data fetching.

### Session Invalidation Pattern

When auth state changes (login/logout), use `queryClient.resetQueries()` to clear the session cache:

```ts
await queryClient.resetQueries({ queryKey: ["session.get"] });
navigate({ to: "/destination" });
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
const listQueryKey = domain.list.queryOptions({ status: "pending" }).queryKey;

const mutation = useMutation({
  mutationFn: domain.review.fn,
  onMutate: async ({ data: { id } }) => {
    // Cancel in-flight queries
    await qc.cancelQueries({ queryKey: listQueryKey });

    // Get previous data for rollback
    const prev = qc.getQueryData(listQueryKey);

    // Optimistically update (e.g., remove item from list)
    qc.setQueryData(listQueryKey, (old) =>
      old?.filter((item) => item.id !== id),
    );

    return { prev };
  },
  onSuccess: () => {
    // Remove other affected queries for when user navigates later
    qc.removeQueries({ queryKey: otherDomain.graph.queryOptions().queryKey });
    toast.success("Done");
  },
  onError: (error, _, context) => {
    // Rollback on error
    if (context?.prev) {
      qc.setQueryData(listQueryKey, context.prev);
    }
    toast.error(error.message);
  },
  onSettled: () => {
    // Ensure data consistency
    qc.invalidateQueries({ queryKey: listQueryKey });
  },
});
```

### Pattern 2: Remove + Navigate (navigating to different page)

**Canonical example: `src/lib/games/rius/hooks.ts` - `useCreateSet()`**

When a mutation completes and navigates to a page that displays affected data, use `removeQueries` before navigating:

```ts
const mutation = useMutation({
  mutationFn: domain.create.fn,
  onMutate: () => {
    qc.cancelQueries({ queryKey: listQueryKey });
  },
  onSuccess: () => {
    toast.success("Created");
    // Remove queries so loader fetches fresh data on navigation
    qc.removeQueries({ queryKey: listQueryKey });
    navigate({ to: "/destination" });
  },
});
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
  queryKey: tricks.submissions.list.queryOptions({ status: "pending" }).queryKey,
});

// Bad - manually constructing keys can drift from actual keys
qc.removeQueries({ queryKey: ["tricks.submissions.list"] });
```

## Button Style Guidelines

Primary action buttons (filters, create, etc.) use **default size** - not `size="sm"`:

```tsx
// Good - default size with icon
<Button variant="outline">
  <FilterIcon className="size-4" />
  Filters
</Button>

// Good - default size, no icon for simple actions
<Button asChild>
  <Link to="/posts/create">Create</Link>
</Button>

// Bad - don't use size="sm" for primary actions
<Button size="sm">
  <Plus className="mr-1.5 size-4" />
  Add Thing
</Button>
```

Guidelines:
- Use default button size for primary page actions (filters, create, etc.)
- Icons are `size-4` with no margin - Button's built-in `gap-2` handles spacing
- Use concise labels: "Create" not "Add Thing" or "Create Thing"
- Reserve `size="sm"` for inline/secondary contexts (back navigation, compact toolbars)

## Documentation

When modifying code that has associated documentation in `docs/`, always update the docs to reflect changes. Keep documentation in sync with implementation.
