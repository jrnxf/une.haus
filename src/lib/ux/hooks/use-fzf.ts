import { Fzf } from "fzf"
import { useMemo } from "react"

export function useFzf<L extends readonly unknown[]>(
  params: ConstructorParameters<typeof Fzf<L>>,
) {
  return useMemo(() => new Fzf(...params), [params])
}
