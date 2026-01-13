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

## Documentation

When modifying code that has associated documentation in `docs/`, always update the docs to reflect changes. Keep documentation in sync with implementation.
