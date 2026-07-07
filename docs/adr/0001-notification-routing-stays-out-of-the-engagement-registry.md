# Notification URL/label resolution stays out of the engagement registry

An architecture review proposed moving `getNotificationUrl` / `formatEntityType` into `lib/engagement/registry.server.ts` bindings to kill their silent `default` fallbacks. Rejected for two structural reasons: the switches key over `NotificationEntityType` (14 members, 8 of which — chat, siu, user, the trick review types, etc. — have no engagement binding at all, while `trick` has a binding but no notification type), and the registry is server-only while notification URLs are consumed by client routes, so client route paths in the registry would drag a server-only module toward the client bundle.

The sanctioned fix for the silent fallbacks is local: exhaustive type-locked maps (`satisfies Record<NotificationEntityType, ...>`) or an `assertNever` tail in `lib/notifications/utils.ts`, making a new entity type a compile error instead of a wrong URL.
