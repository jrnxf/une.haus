import { defineTask } from "nitro/task"

import { rotate } from "~/lib/games/rius/lifecycle.server"
import { logger } from "~/lib/logger"
import { TASK_NAMES } from "~/lib/tasks/constants"

export default defineTask({
  meta: {
    name: TASK_NAMES.RIUS_ROTATE,
    description:
      "Rotate RIUs: archive active, activate upcoming, create new upcoming",
  },
  async run() {
    const task = TASK_NAMES.RIUS_ROTATE
    logger.info("rius rotation started", { task })

    const { archived, activated, newRoundId } = await rotate()

    logger.info("rius rotation complete", {
      task,
      archived,
      activated,
      newRiuId: newRoundId,
    })

    return {
      result: {
        success: true,
        archived,
        activated,
        newRiuId: newRoundId,
      },
    }
  },
})
