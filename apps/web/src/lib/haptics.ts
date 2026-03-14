import { createContext, useContext, useMemo } from "react"

import type { HapticInput, TriggerOptions } from "web-haptics"

type TriggerFn = (
  input?: HapticInput,
  options?: TriggerOptions,
) => Promise<void> | undefined

export const HapticsContext = createContext<TriggerFn | null>(null)

export function useHaptics() {
  const trigger = useContext(HapticsContext)
  return useMemo(
    () => ({
      selection: () => trigger?.("selection"),
      success: () => trigger?.("success"),
      error: () => trigger?.("error"),
      warning: () => trigger?.("warning"),
      heavy: () => trigger?.("heavy"),
      light: () => trigger?.("light"),
      medium: () => trigger?.("medium"),
    }),
    [trigger],
  )
}
