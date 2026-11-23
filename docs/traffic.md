# traffic

`/admin/traffic` shows the site admin numbers that Cloudflare measures and we cannot count ourselves: visits, referrers, countries, devices, browsers, page speed per page, and how the worker and the database run. The admin overview shows four of them in a "traffic" card, with a link to the page.

Our own counts stay the source for members, features and top pages. See `docs/insights.md`.

## Source

One request to Cloudflare's [GraphQL Analytics API](https://developers.cloudflare.com/analytics/graphql-api/) per page load (`getTraffic` in `src/lib/traffic/ops.server.ts`). It reads three data sets:

- **Web Analytics** (`rumPageloadEventsAdaptiveGroups`, `rumWebVitalsEventsAdaptiveGroups`) - a beacon in the browser. Visits, page views, referrers, countries, devices, browsers and the three Core Web Vitals per path. It is a sample, and an ad blocker stops the beacon. Bots are left out.
- **Worker metrics** (`workersInvocationsAdaptive`) - every request the worker serves: the count, how each ended, and cpu time.
- **D1 metrics** (`d1AnalyticsAdaptiveGroups`) - queries, rows read and rows written of the production database.

The server function is admin only. The client caches the answer for 5 minutes.

## Setup

`CLOUDFLARE_ANALYTICS_API_TOKEN` is a Cloudflare API token with one permission: Account Analytics, Read. It is a worker secret. `CLOUDFLARE_ACCOUNT_ID` is the account it reads.

Without the token the page says "traffic is off" and the overview shows no traffic card. When Cloudflare refuses the request, the page shows Cloudflare's message.

## Limits

- Cloudflare answers for a range of 4 weeks and 4 days at most on this plan. The page asks for 31 days at most and says so when the range select is at 90.
- Days are UTC days, not Portugal days as in the insights tables.
- Times arrive in microseconds. `microsToMs` turns them into milliseconds.
- A vital that Cloudflare could not measure arrives as a negative number, and a paint as zero. The page shows a dash.

## Page speed

`groupSpeed` in `src/lib/traffic/shape.ts` builds the table. Cloudflare gives a 75th percentile per real path. A path segment of digits is an id, so `/posts/123` and `/posts/456` join into `/posts/$id`. The joined value is a mean weighted by samples, which is close to the true percentile but not exact.

The colors follow Google's Core Web Vitals limits: largest paint 2.5 s and 4 s, click delay (INP) 200 ms and 500 ms, layout shift 0.1 and 0.25.

The privacy page (`src/routes/privacy.tsx`, "Traffic Numbers") names Cloudflare Web Analytics.
