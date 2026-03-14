import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import { authMiddleware, authOptionalMiddleware } from "~/lib/middleware"
import {
  deleteNotificationSchema,
  listNotificationsSchema,
  markAllReadSchema,
  markGroupReadSchema,
  markReadSchema,
} from "~/lib/notifications/schemas"

const loadNotificationOps = createServerOnlyFn(
  () => import("~/lib/notifications/ops.server"),
)

export const listNotificationsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listNotificationsSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { listNotifications } = await loadNotificationOps()
    return listNotifications(ctx)
  })

export const listGroupedNotificationsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listNotificationsSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { listGroupedNotifications } = await loadNotificationOps()
    return listGroupedNotifications(ctx)
  })

export const getUnreadCountServerFn = createServerFn({
  method: "GET",
})
  .middleware([authOptionalMiddleware])
  .handler(async (ctx) => {
    const { getUnreadCount } = await loadNotificationOps()
    return getUnreadCount(ctx)
  })

export const markReadServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(markReadSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { markRead } = await loadNotificationOps()
    return markRead(ctx)
  })

export const markGroupReadServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(markGroupReadSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { markGroupRead } = await loadNotificationOps()
    return markGroupRead(ctx)
  })

export const markAllReadServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(markAllReadSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { markAllRead } = await loadNotificationOps()
    return markAllRead(ctx)
  })

export const deleteNotificationServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(deleteNotificationSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { deleteNotification } = await loadNotificationOps()
    return deleteNotification(ctx)
  })
