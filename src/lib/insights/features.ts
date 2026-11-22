// Pure helpers for admin insights: which day an event falls on, and which
// feature a page or a server function belongs to.

// Insights group days in Portugal time, the owner's time zone.
export const INSIGHTS_TIME_ZONE = "Europe/Lisbon"

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: INSIGHTS_TIME_ZONE,
})

// The Portugal-time day of a moment, as YYYY-MM-DD.
export function insightsDay(ms = Date.now()) {
  return dayFormat.format(new Date(ms))
}

// The days from `count - 1` days before `today` up to `today`, oldest first.
export function lastDays(count: number, today = insightsDay()) {
  const [y = 0, m = 1, d = 1] = today.split("-").map(Number)
  const days: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    // Noon UTC never crosses a day line when only the date part is read.
    days.push(
      new Date(Date.UTC(y, m - 1, d - i, 12)).toISOString().slice(0, 10),
    )
  }
  return days
}

// A route pattern from the router, such as /vault/$videoId. Only these
// characters pass, so the beacon cannot store a raw URL or free text.
const ROUTE_PATTERN = /^\/[\w$./-]{0,100}$/

export function isRoutePattern(route: unknown): route is string {
  return typeof route === "string" && ROUTE_PATTERN.test(route)
}

const GAMES = new Set(["rius", "bius", "sius"])

// Admin pages are the owner looking at the site, not use of it, so they
// count nowhere.
export function isTrackedRoute(route: string) {
  return !/^\/admin(?:\/|$)/.test(route)
}

// Pages that count as page views but not as a member using a feature:
// signing in is not use of une.haus.
const NOT_FEATURES = new Set(["auth"])

// The feature a page belongs to: its first path segment, or the game for a
// game page. The home page is "home". Null for a page that is not a
// feature.
export function featureOfRoute(route: string) {
  const [first, second] = route.split("/").filter(Boolean)
  if (!first) return "home"
  if (NOT_FEATURES.has(first)) return null
  if (first === "games" && second && GAMES.has(second)) return second
  return first
}

// Server function folders (src/lib/<folder>/...) whose writes count as
// actions, and the feature each one counts toward. Writes from any other
// folder (session, auth, notifications, ...) are housekeeping, not use.
const ACTION_FEATURES: Record<string, string> = {
  arcade: "arcade",
  feedback: "feedback",
  flags: "flags",
  gelato: "shop",
  messages: "messages",
  posts: "posts",
  reactions: "likes",
  tourney: "tourney",
  tricks: "tricks",
  users: "users",
  utv: "vault",
}

// The feature a server function write counts toward, from the source file
// TanStack Start reports for it, or null when it does not count.
export function featureOfServerFn(filename: string) {
  const [, folder, sub] =
    filename.match(/(?:^|\/)src\/lib\/([^/]+)\/(?:([^/]+)\/)?/) ?? []
  if (!folder) return null
  if (folder === "games") return sub && GAMES.has(sub) ? sub : null
  return ACTION_FEATURES[folder] ?? null
}
