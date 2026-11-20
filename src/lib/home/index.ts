import { queryOptions } from "@tanstack/react-query"

import { getHomeBoardServerFn } from "~/lib/home/fns"

export const home = {
  board: {
    fn: getHomeBoardServerFn,
    queryOptions: () =>
      queryOptions({
        queryKey: ["home.board"],
        queryFn: () => getHomeBoardServerFn(),
      }),
  },
}
