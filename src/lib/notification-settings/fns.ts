import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import { authMiddleware } from "~/lib/middleware"
import { updateNotificationSettingsSchema } from "~/lib/notification-settings/schemas"

const loadNotificationSettingsOps = createServerOnlyFn(
  () => import("~/lib/notification-settings/ops.server"),
)

export const getNotificationSettingsServerFn = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { getNotificationSettings } = await loadNotificationSettingsOps()
    return getNotificationSettings(ctx)
  })

export const updateNotificationSettingsServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateNotificationSettingsSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { updateNotificationSettings } = await loadNotificationSettingsOps()
    return updateNotificationSettings(ctx)
  })
