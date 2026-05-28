import { eq } from "drizzle-orm"
import { defineTask } from "nitro/task"

import { db } from "~/db"
import { rius } from "~/db/schema"
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

    // Archive the currently active RIU
    const archivedResult = await db
      .update(rius)
      .set({ status: "archived" })
      .where(eq(rius.status, "active"))
      .returning()

    logger.info("archived active rius", {
      task,
      archived: archivedResult.length,
    })

    // Promote upcoming RIU to active
    const activatedResult = await db
      .update(rius)
      .set({ status: "active" })
      .where(eq(rius.status, "upcoming"))
      .returning()

    logger.info("activated upcoming rius", {
      task,
      activated: activatedResult.length,
    })

    // Create a new upcoming RIU
    const [newRiu] = await db
      .insert(rius)
      .values({ status: "upcoming" })
      .returning()

    logger.info("created new upcoming riu", { task, newRiuId: newRiu.id })

    return {
      result: {
        success: true,
        archived: archivedResult.length,
        activated: activatedResult.length,
        newRiuId: newRiu.id,
      },
    }
  },
})
