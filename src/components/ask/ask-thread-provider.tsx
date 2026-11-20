import { useAskThreadState } from "~/lib/ask/hooks"
import { AskThreadContext } from "~/lib/ask/thread-context"

import type { ReactNode } from "react"

// Holds the ask thread above the routes. See useAskThreadState.
export function AskThreadProvider({ children }: { children: ReactNode }) {
  const thread = useAskThreadState()
  return (
    <AskThreadContext.Provider value={thread}>
      {children}
    </AskThreadContext.Provider>
  )
}
