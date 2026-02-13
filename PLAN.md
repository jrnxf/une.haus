# Activity Page with Cards

## Overview

Create a dedicated `/activity` route that displays the current user's activity in a card-based layout (vs. the compact timeline on the profile page).

## Files to Create/Modify

### 1. New Route: `src/routes/_authed/activity/index.tsx`

- Uses `users.activity.infiniteQueryOptions` with session user ID
- Type filter dropdown (same as current)
- Renders activity items as cards in a responsive grid
- Infinite scroll with "Load more" or intersection observer

### 2. New Component: `src/components/activity/activity-card.tsx`

A polymorphic card component that renders differently based on activity type:

**Post Card**

- Title, content preview (2-3 lines)
- Paperclip icon if has media
- Timestamp

**Comment Card**

- "Commented on {parentTitle}"
- Comment content preview
- Link to parent

**RIU Set Card**

- Set name, instructions preview
- "Created set" label

**RIU Submission Card**

- "Submitted to {setName}"
- Video thumbnail if muxAssetId available

**BIU/SIU Cards**

- Chain reference
- "Added to Back It Up" / "Added to Stack It Up"

**Trick Activity Cards** (submission, suggestion, video)

- Trick name
- Status badge for pending items
- Type-specific icon

**Vault Suggestion Card**

- Video title
- "Suggested edit" label

### 3. Navigation

Add link to activity page from user menu or profile.

## Card Design Pattern

Following existing patterns from `set-card.tsx` and `submission-card.tsx`:

```
┌─────────────────────────────────────────┐
│ [Icon] Activity Type Label   · 2h ago   │
│                                         │
│ Title or Name                           │
│ Description/content preview...          │
│                                         │
└─────────────────────────────────────────┘
```

- Consistent border, padding (`p-4`), rounded corners
- Hover state with `hover:border-primary/30`
- Clickable (entire card is a Link)
- Type-specific icon in top-left
- Timestamp in top-right

## Implementation Steps

1. Create `src/routes/_authed/activity/index.tsx` with route structure
2. Create `src/components/activity/activity-card.tsx` with card variants
3. Add navigation link to the activity page
4. Test with various activity types

## Notes

- This shows the **current user's** activity (requires auth)
- Uses existing `users.activity` query - no backend changes
- Could extend to global feed later (would need backend to include user info per item)
