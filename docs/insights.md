# insights

The admin area shows the site admin how une.haus gets used. `/admin` is the overview: totals, daily active members, feature use, top pages and a usage table with one row per member. `/admin/ask` shows the ask numbers. Both have a range select of 7, 30 or 90 days (`?days=`, default 30, left out of the address when it is 30). The old `/admin/insights` links redirect to these pages.

The admin area is a pathless layout, `src/routes/_authed/admin/_shell.tsx`. It renders the header tabs (overview, queue, ask, sandbox), the range select and the build sha. The trick admin pages under `/admin/tricks` stay outside it and keep their own header.

Insights save numbers only. No question or answer text, no raw URL and no third party. The counts live in our own D1. The privacy page (`src/routes/privacy.tsx`, "Usage Counts") says so.

## Tables

All in `src/db/schema.ts`, created by `drizzle/0001_admin_insights.sql`.

- `daily_page_views` - one row per day and route pattern, with a view count. Guests count here too.
- `daily_activity` - one row per day, member and feature, with `views` and `actions` counts.
- `ask_events` - one row per ask question: member, day, source (`ask` or `home`), tool names, turns, cost in millionths of a dollar, and an error code or null.

Each write is one upsert that adds to a count (`src/lib/insights/record.server.ts`), so concurrent requests never lose a count. Writes run in `background()` and never slow a response.

## Days

A day is the calendar day in Portugal time (`Europe/Lisbon`, `insightsDay` in `src/lib/insights/features.ts`), stored as `YYYY-MM-DD`.

## Page views

`src/router.tsx` sends a beacon to `/api/view` (`src/routes/api/view.ts`) each time the path changes, and on the first load. The body is the leaf route pattern, such as `/vault/$videoId`, never the real URL. A change to search params only (a filter) is not a view. The endpoint accepts only route-pattern characters (`isRoutePattern`).

- `/admin/*` pages count nowhere (`isTrackedRoute`). They are the admin looking at the site, not use of it.
- `/auth/*` pages count as page views, but not as feature use (`NOT_FEATURES`).
- The feature of a page is its first path segment, the game for a game page, and `home` for `/` (`featureOfRoute`).

## Actions

`activityMiddleware` in `src/start.ts` is a global function middleware. After each POST server function by a signed-in member, it adds one action to the feature of the function's folder (`featureOfServerFn`). Only folders in `ACTION_FEATURES` count, such as `posts`, `reactions` (as `likes`) and the games. Session, auth and notification writes are housekeeping and do not count.

## Ask

`runAsk` (`src/lib/ask/run.server.ts`) calls `recordAsk` when a question ends, also when it fails. `/api/ask` records a `limit` event when it answers 429. Each question also counts as one `ask` action for the member.

## Reads

`src/lib/insights/ops.server.ts` builds each page (`getOverview` and `getMemberInsights` for the overview, `getAskInsights` for ask). Where a page compares, it compares with the same number of days just before the range. The server functions in `src/lib/insights/fns.ts` are admin only.
