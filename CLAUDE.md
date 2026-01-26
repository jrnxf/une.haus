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
  context.queryClient.ensureQueryData(domain.get.queryOptions());

// Component uses same query options
const { data } = useSuspenseQuery(domain.get.queryOptions());
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

For pages with search/filter inputs that use `useSuspenseInfiniteQuery`, use this pattern to prevent UI disappearance during data fetching:

**Canonical examples:**

- `src/routes/posts/index.tsx`
- `src/routes/users/index.tsx`
- `src/routes/vault/index.tsx`

```tsx
import { useDeferredValue, useRef, useState } from "react";

import { useDebounceValue } from "usehooks-ts";

function RouteComponent() {
  // 1. inputValue: immediate feedback for the input field
  const [inputValue, setInputValue] = useState(searchParams.q ?? "");

  // 2. debouncedInput: reduces query frequency (200ms delay)
  const [debouncedInput] = useDebounceValue(inputValue, 200);

  // 3. deferredQuery: prevents UI disappearance during suspense
  const deferredQuery = useDeferredValue(debouncedInput);

  // For non-text filters (tags, categories), also defer them
  const [tags, setTags] = useState(searchParams.tags ?? []);
  const deferredTags = useDeferredValue(tags);

  // Update URL when debounced input changes (for bookmarking)
  const lastUrlQuery = useRef(searchParams.q ?? "");
  if (debouncedInput !== lastUrlQuery.current) {
    lastUrlQuery.current = debouncedInput;
    router.navigate({
      to: "/current-route",
      search: (prev) => ({ ...prev, q: debouncedInput || undefined }),
      replace: true,
    });
  }

  // Query uses DEFERRED values - never raw state
  const { data } = useSuspenseInfiniteQuery(
    domain.list.infiniteQueryOptions({
      q: deferredQuery || undefined,
      tags: deferredTags.length > 0 ? deferredTags : undefined,
    }),
  );
}
```

**Why this pattern?**

1. **`useDebounceValue`** - Prevents query spam. Without it, every keystroke fires a query.

2. **`useDeferredValue`** - Tells React "keep showing old UI while new data loads". Without it, `useSuspenseInfiniteQuery` suspends on query key change, and TanStack Router's internal Suspense boundary shows an empty fallback (page disappears).

3. **Both are needed** - Debouncing alone still causes UI disappearance when the debounced value finally changes. Deferring alone still fires queries on every keystroke.

**Important:** The loader must await `ensureInfiniteQueryData` for SSR to work:

```tsx
loader: async ({ context, deps }) => {
  await context.queryClient.ensureInfiniteQueryData(
    domain.list.infiniteQueryOptions(deps),
  );
},
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
  queryKey: tricks.submissions.list.queryOptions({ status: "pending" })
    .queryKey,
});

// Bad - manually constructing keys can drift from actual keys
qc.removeQueries({ queryKey: ["tricks.submissions.list"] });
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
- `src/routes/games/rius/route.tsx` - Admin dropdown menu
- `src/routes/tricks/index.tsx` - Admin dropdown menu

## Spacing Guidelines

Use consistent Tailwind spacing utilities throughout the codebase. Avoid non-standard values.

### Flex/Grid Gaps

Use these standard gap values:

- `gap-1` - Tight spacing (icons, small button groups)
- `gap-2` - **Default** for most flex/grid layouts
- `gap-4` - Medium spacing (card content, form sections)
- `gap-6` - Large spacing (section separation)

**Avoid:** `gap-3`, `gap-5`, `gap-7`, `gap-8+`

### Vertical Stacking (space-y)

- `space-y-1` - Tight (error messages, compact lists)
- `space-y-2` - Default (form fields, list items)
- `space-y-4` - Medium (content sections)
- `space-y-6` - Large (page sections)

**Avoid:** `space-y-3`, `space-y-5`, `space-y-7`, `space-y-8+`

### Container Padding

- `p-4` - Compact containers, mobile
- `p-6` - Cards, dialogs, modals

**Avoid:** `p-3`, `p-5`, `p-7`

### Page Containers

Standard pattern for route content:

```tsx
<div className="mx-auto w-full max-w-4xl px-4 py-6">{/* content */}</div>
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

| Context            | Standard Values                                    | Avoid                                  |
| ------------------ | -------------------------------------------------- | -------------------------------------- |
| Flex gaps          | `gap-1`, `gap-2`, `gap-4`, `gap-6`                 | `gap-3`, `gap-5`, `gap-7+`             |
| Vertical stacking  | `space-y-1`, `space-y-2`, `space-y-4`, `space-y-6` | `space-y-3`, `space-y-5`, `space-y-7+` |
| Padding            | `p-4`, `p-6`                                       | `p-3`, `p-5`, `p-7`                    |
| Horizontal padding | `px-2`, `px-4`, `px-6`                             | `px-3`, `px-5`                         |
| Vertical padding   | `py-1`, `py-2`, `py-4`, `py-6`                     | `py-3`, `py-5`                         |

## Documentation

When modifying code that has associated documentation in `docs/`, always update the docs to reflect changes. Keep documentation in sync with implementation.
