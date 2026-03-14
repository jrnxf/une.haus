import { queryOptions } from "@tanstack/react-query"

import {
  getNotificationSettingsServerFn,
  updateNotificationSettingsServerFn,
} from "~/lib/notification-settings/fns"
import { updateNotificationSettingsSchema } from "~/lib/notification-settings/schemas"

export const notificationSettings = {
  get: {
    fn: getNotificationSettingsServerFn,
    queryOptions: () =>
      queryOptions({
        queryKey: ["notification-settings.get"],
        queryFn: getNotificationSettingsServerFn,
      }),
  },
  update: {
    fn: updateNotificationSettingsServerFn,
    schema: updateNotificationSettingsSchema,
  },
}
