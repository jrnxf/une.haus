# Tricks Feature

This document outlines the structure of the tricks feature, including routes, data flow, and cache invalidation patterns.

## Routes

### Public Routes

| Route | Description |
|-------|-------------|
| `/tricks` | Main tricks graph page with interactive visualization |

### Authenticated Routes

| Route | Description |
|-------|-------------|
| `/tricks/submit` | Submit a new trick for community review |
| `/tricks/review` | Review pending submissions, suggestions, and videos |
| `/tricks/$trickId/suggest` | Suggest edits to an existing trick |
| `/tricks/$trickId/submit-video` | Submit a video for an existing trick |

### Admin Routes

| Route | Description |
|-------|-------------|
| `/admin/tricks/create` | Create a trick directly (bypasses review) |
| `/admin/tricks/$trickId/edit` | Edit an existing trick |
| `/admin/tricks/$trickId/videos` | Manage videos for a trick |
| `/admin/tricks/elements` | Manage trick elements |
| `/admin/tricks/elements/create` | Create a new element |
| `/admin/tricks/elements/$elementId/edit` | Edit an element |
| `/admin/tricks/modifiers` | Manage trick modifiers |

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

| Component | Description |
|-----------|-------------|
| `tricks-graph.tsx` | Main ReactFlow-based graph visualization |
| `tricks-sidebar.tsx` | Sidebar with trick search and filters |
| `tricks-search.tsx` | Search input for tricks |
| `trick-card.tsx` | Card display for a trick |
| `trick-detail.tsx` | Modal/dialog with full trick details |
| `trick-node.tsx` | ReactFlow node component |
| `skill-tree.tsx` | Alternative tree visualization |
| `element-lane.tsx` | Swimlane for tricks by element |
| `submission-card.tsx` | Card for pending submissions |
| `suggestion-card.tsx` | Card for pending suggestions |
| `video-carousel.tsx` | Video carousel for trick detail |
| `video-submit-form.tsx` | Form for submitting videos |

## Query Keys

All tricks queries use a hierarchical key structure:

```ts
["tricks.graph"]                           // Full graph data
["tricks.list", data]                      // List with filters
["tricks.get", { slug }]                   // Single trick by slug
["tricks.getById", { id }]                 // Single trick by ID
["tricks.search", { query }]               // Search results
["tricks.elements.list"]                   // All elements
["tricks.modifiers.list"]                  // All modifiers
["tricks.submissions.list", { status }]    // Submissions by status
["tricks.suggestions.list", { status }]    // Suggestions by status
["tricks.videos.list", { trickId }]        // Videos for a trick
["tricks.videos.pending"]                  // All pending videos
```

## Cache Invalidation Pattern

When mutations navigate to a new page, we use a **prefetch-before-navigate** pattern to prevent white screen flashes:

```ts
const mutation = useMutation({
  mutationFn: tricks.create.fn,
  onSuccess: async () => {
    toast.success("Done");

    // 1. Clear stale cache
    qc.removeQueries({ queryKey: tricks.graph.queryOptions().queryKey });

    // 2. Prefetch fresh data before navigating
    await qc.prefetchQuery(tricks.graph.queryOptions());

    // 3. Navigate - route loader finds data in cache immediately
    router.navigate({ to: "/tricks" });
  },
});
```

This pattern is used in:
- `/admin/tricks/create` → `/tricks`
- `/admin/tricks/$trickId/edit` → `/tricks`
- `/tricks/submit` → `/tricks/review`
- `/tricks/$trickId/suggest` → `/tricks/review`
- `/tricks/$trickId/submit-video` → `/tricks/review`

For mutations that stay on the same page (like approving/rejecting in review), use **optimistic updates** instead. See `src/routes/_authed/tricks/review.tsx` for examples.

## Review Page Architecture

The `/tricks/review` page loads multiple queries (submissions, suggestions, videos). The admin videos tab uses `useSuspenseQuery` which must follow React hooks rules.

To avoid conditional hook calls, the videos functionality is extracted into separate components that are only rendered for admins:

```tsx
// These components can safely use useSuspenseQuery because
// they're only mounted when isAdmin is true
{isAdmin && <AdminVideosTabTrigger />}
{isAdmin && <AdminVideosTabContent />}
```

## User Flows

### User Submits New Trick
1. User fills form at `/tricks/submit`
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
