# Project Guidelines

## TypeScript Style

- Always use `type` instead of `interface` for type definitions

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
