import { createContext, useContext } from "react"

import { type useAskThreadState } from "~/lib/ask/hooks"
import { invariant } from "~/lib/invariant"

export const AskThreadContext = createContext<ReturnType<
  typeof useAskThreadState
> | null>(null)

// The ask thread and its actions, shared by the home page and /ask.
export function useAskThread() {
  const thread = useContext(AskThreadContext)
  invariant(thread, "useAskThread must be used inside AskThreadProvider")
  return thread
}
