import { type ReactNode } from "react"
import { useWebHaptics } from "web-haptics/react"

import { HapticsContext } from "~/lib/haptics"

export function HapticsProvider({ children }: { children: ReactNode }) {
  const { trigger } = useWebHaptics()

  return (
    <HapticsContext.Provider value={trigger}>
      {children}
    </HapticsContext.Provider>
  )
}
