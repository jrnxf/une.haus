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
  .middleware([authMiddleware])
  .inputValidator(zodValidator(listNotificationsSchema))
  .handler(async (ctx) => {
    const { listNotifications } = await loadNotificationOps()
    return listNotifications(ctx)
  })

export const listGroupedNotificationsServerFn = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .inputValidator(zodValidator(listNotificationsSchema))
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
  .middleware([authMiddleware])
  .inputValidator(zodValidator(markReadSchema))
  .handler(async (ctx) => {
    const { markRead } = await loadNotificationOps()
    return markRead(ctx)
  })

export const markGroupReadServerFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .inputValidator(zodValidator(markGroupReadSchema))
  .handler(async (ctx) => {
    const { markGroupRead } = await loadNotificationOps()
    return markGroupRead(ctx)
  })

export const markAllReadServerFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .inputValidator(zodValidator(markAllReadSchema))
  .handler(async (ctx) => {
    const { markAllRead } = await loadNotificationOps()
    return markAllRead(ctx)
  })

export const deleteNotificationServerFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .inputValidator(zodValidator(deleteNotificationSchema))
  .handler(async (ctx) => {
    const { deleteNotification } = await loadNotificationOps()
    return deleteNotification(ctx)
  })
