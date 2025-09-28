import { useMemo } from "react";

import { Fzf } from "fzf";

export function useFzf<L extends readonly unknown[]>(
  params: ConstructorParameters<typeof Fzf<L>>,
) {
  return useMemo(() => new Fzf(...params), [params]);
}
