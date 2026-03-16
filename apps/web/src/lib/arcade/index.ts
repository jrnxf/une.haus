import { queryOptions } from "@tanstack/react-query"

import {
  getArcadeHighScoreServerFn,
  saveArcadeHighScoreServerFn,
} from "~/lib/arcade/fns"
import { saveHighScoreSchema } from "~/lib/arcade/schemas"

export const arcade = {
  highScore: {
    get: {
      fn: getArcadeHighScoreServerFn,
      queryOptions: () => {
        return queryOptions({
          queryKey: ["arcade.highScore.get"],
          queryFn: getArcadeHighScoreServerFn,
        })
      },
    },
    save: {
      fn: saveArcadeHighScoreServerFn,
      schema: saveHighScoreSchema,
    },
  },
}
