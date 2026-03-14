import { useSyncExternalStore } from "react"

const noopUnsubscribe = () => {}
const noop = () => noopUnsubscribe
const getSnapshot = () =>
  /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "⌃"
const getServerSnapshot = () => "⌘"

/** Returns `"⌘"` on Apple devices, `"⌃"` everywhere else. */
export function useModifierKey() {
  return useSyncExternalStore(noop, getSnapshot, getServerSnapshot)
}
