import { createContext } from "react"

import { type AskCard } from "~/lib/ask/schemas"

// The previews for the une.haus links in one answer, by path.
export const AskLinksContext = createContext<Map<string, AskCard>>(new Map())
