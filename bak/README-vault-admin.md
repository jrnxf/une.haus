# Vault Admin Scaling Feature

This folder contains backup files for the vault admin thumbnail scaling feature.

## What It Does

Many UTV (unicycle.tv) videos have yellow letterboxing/pillarboxing bars from the original encoding. This admin feature allows scaling thumbnails to crop out those bars.

## How It Works

### Auto-Scale Algorithm (`computeAutoScale`)

1. Loads the thumbnail image onto a canvas
2. Samples pixels along all edges (left, right, top, bottom) at multiple depths
3. Detects the specific yellow color (#EAC50A) used in UTV letterboxing
4. Uses binary search to find the minimum scale factor (1.0-3.0) that hides all yellow edges
5. Adds a small buffer (0.08) to ensure complete coverage

### Admin UI

- **Grid view**: All vault videos displayed as thumbnail grid
- **Selection**: Click to toggle, Shift+click for range selection
- **Scale slider**: Adjust scale for selected videos (100%-300%)
- **Auto-scale All**: Runs the algorithm on all videos in current filter
- **Save**: Persists scales to `src/db/scripts/vault-scales.bak.ts`

### Database Integration

The `utvVideos` table has a `scale` column (default: 1.0) that stores the computed scale for each video. Thumbnails are displayed with `transform: scale(X)` to crop the letterboxing.

## Files

- `vault-admin-grid.tsx` - The original dedicated admin route component
- `README-vault-admin.md` - This file

## Related Files (still in codebase)

- `src/lib/utv/fns.ts` - Contains `saveUtvScalesServerFn` for persisting scales
- `src/db/schema.ts` - `utvVideos.scale` column definition
- `src/db/scripts/vault-scales.bak.ts` - Generated file with scale values

## Current Implementation

The admin functionality is integrated into the main `/vault` route:
- Admin toggle button (top right, visible to admins only)
- When admin mode is ON, accordion content shows:
  - Scale slider (starts at current DB value)
  - Large thumbnail preview with scale applied
  - Auto-saves to DB on slider release
- When admin mode is OFF, accordion content shows video player as normal
- Uses `useUpdateScale()` mutation with optimistic updates

