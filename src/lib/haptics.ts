import { WebHaptics } from "web-haptics"

let instance: WebHaptics | null = null

function get(): WebHaptics | null {
  if (typeof window === "undefined") return null
  if (!instance) instance = new WebHaptics()
  return instance
}

export const haptics = {
  selection: () => get()?.trigger("selection"),
  success: () => get()?.trigger("success"),
  error: () => get()?.trigger("error"),
  warning: () => get()?.trigger("warning"),
  heavy: () => get()?.trigger("heavy"),
  light: () => get()?.trigger("light"),
  medium: () => get()?.trigger("medium"),
}
