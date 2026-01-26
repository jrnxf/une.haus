# Tricks Feature

This document outlines the structure of the tricks feature, including routes, data flow, and cache invalidation patterns.

## Routes

### Public Routes

| Route     | Description                                           |
| --------- | ----------------------------------------------------- |
| `/tricks` | Main tricks graph page with interactive visualization |

### Authenticated Routes

| Route                           | Description                                                  |
| ------------------------------- | ------------------------------------------------------------ |
| `/tricks/create`                | Create a new trick (submit for review, or directly as admin) |
| `/tricks/review`                | Review pending submissions, suggestions, and videos          |
| `/tricks/$trickId/suggest`      | Suggest edits to an existing trick                           |
| `/tricks/$trickId/submit-video` | Submit a video for an existing trick                         |

### Admin Routes

| Route                                    | Description               |
| ---------------------------------------- | ------------------------- |
| `/admin/tricks/$trickId/edit`            | Edit an existing trick    |
| `/admin/tricks/$trickId/videos`          | Manage videos for a trick |
| `/admin/tricks/elements`                 | Manage trick elements     |
| `/admin/tricks/elements/create`          | Create a new element      |
| `/admin/tricks/elements/$elementId/edit` | Edit an element           |
| `/admin/tricks/modifiers`                | Manage trick modifiers    |

## Data Model

### Core Tables

- `tricks` - The main tricks table with name, slug, definition, etc.
- `trickElements` - Building blocks of tricks (e.g., "unispin", "crankflip")
- `trickModifiers` - Modifiers that can be applied to tricks
- `trickVideos` - Videos associated with tricks (can be pending/active/rejected)
- `trickRelationships` - Prerequisite and related trick connections
- `trickElementAssignments` - Many-to-many between tricks and elements

### Community Review Tables

- `trickSubmissions` - New tricks submitted by users for review
- `trickSuggestions` - Suggested edits to existing tricks

## Library Structure (`src/lib/tricks/`)

```
src/lib/tricks/
├── index.ts           # Facade object with all operations
├── fns.ts             # Server functions for tricks CRUD
├── schemas.ts         # Zod schemas for validation
├── types.ts           # TypeScript types
├── data.ts            # Static trick data (JSON import)
├── compute.ts         # Graph computation logic
├── submissions/
│   ├── fns.ts         # Server functions for submissions
│   └── schemas.ts     # Submission schemas
└── videos/
    ├── fns.ts         # Server functions for videos
    └── schemas.ts     # Video schemas
```

## Components (`src/components/tricks/`)

| Component               | Description                              |
| ----------------------- | ---------------------------------------- |
| `tricks-graph.tsx`      | Main ReactFlow-based graph visualization |
| `tricks-sidebar.tsx`    | Sidebar with trick search and filters    |
| `tricks-search.tsx`     | Search input for tricks                  |
| `trick-card.tsx`        | Card display for a trick                 |
| `trick-detail.tsx`      | Modal/dialog with full trick details     |
| `trick-node.tsx`        | ReactFlow node component                 |
| `skill-tree.tsx`        | Alternative tree visualization           |
| `element-lane.tsx`      | Swimlane for tricks by element           |
| `submission-card.tsx`   | Card for pending submissions             |
| `suggestion-card.tsx`   | Card for pending suggestions             |
| `video-carousel.tsx`    | Video carousel for trick detail          |
| `video-submit-form.tsx` | Form for submitting videos               |

## Query Keys

All tricks queries use a hierarchical key structure:

```ts
["tricks.graph"][("tricks.list", data)][("tricks.get", { slug })][ // Full graph data // List with filters // Single trick by slug
  ("tricks.getById", { id })
][("tricks.search", { query })]["tricks.elements.list"][ // Single trick by ID // Search results // All elements
  "tricks.modifiers.list"
][("tricks.submissions.list", { status })][ // All modifiers // Submissions by status
  ("tricks.suggestions.list", { status })
][("tricks.videos.list", { trickId })]["tricks.videos.pending"]; // Suggestions by status // Videos for a trick // All pending videos
```

## Cache Invalidation Pattern

When mutations navigate to a new page, use a **remove-and-navigate** pattern. The destination route's loader will fetch fresh data via `ensureQueryData`:

```ts
const mutation = useMutation({
  mutationFn: tricks.create.fn,
  onSuccess: () => {
    toast.success("Done");
    // Clear stale cache - loader will fetch fresh data on navigation
    qc.removeQueries({ queryKey: tricks.graph.queryOptions().queryKey });
    router.navigate({ to: "/tricks" });
  },
});
```

This works because:

1. `removeQueries` clears the affected cache entries
2. `navigate` triggers the route loader
3. Loader calls `ensureQueryData` which fetches fresh data (cache is empty)
4. Component renders with fresh data

This pattern is used in:

- `/admin/tricks/$trickId/edit` → `/tricks`
- `/tricks/create` (admin) → `/tricks`
- `/tricks/create` (user) → `/tricks/review`
- `/tricks/$trickId/suggest` → `/tricks/review`
- `/tricks/$trickId/submit-video` → `/tricks/review`

For mutations that stay on the same page (like approving/rejecting in review), use **optimistic updates** instead. See `src/routes/_authed/tricks/review.tsx` for examples.

## Review Page Architecture

The `/tricks/review` page loads multiple queries (submissions, suggestions, videos). The admin videos tab uses `useSuspenseQuery` which must follow React hooks rules.

To avoid conditional hook calls, the videos functionality is extracted into separate components that are only rendered for admins:

```tsx
// These components can safely use useSuspenseQuery because
// they're only mounted when isAdmin is true
{
  isAdmin && <AdminVideosTabTrigger />;
}
{
  isAdmin && <AdminVideosTabContent />;
}
```

## User Flows

### User Submits New Trick

1. User fills form at `/tricks/create`
2. Creates `trickSubmission` record with status "pending"
3. Navigates to `/tricks/review` to see their submission
4. Admin reviews and approves/rejects
5. If approved, creates actual `trick` record

### User Suggests Edit

1. User views trick, clicks suggest
2. Fills form at `/tricks/$trickId/suggest` showing diff
3. Creates `trickSuggestion` record with status "pending"
4. Admin reviews and approves/rejects
5. If approved, updates the `trick` record

### User Submits Video

1. User uploads video at `/tricks/$trickId/submit-video`
2. Creates `trickVideo` record with status "pending"
3. Admin reviews at `/tricks/review` (videos tab)
4. If approved, video becomes active and shows on trick detail
