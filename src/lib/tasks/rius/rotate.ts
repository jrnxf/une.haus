import { defineTask } from "nitro/task";

import { eq } from "drizzle-orm";

import { db } from "~/db";
import { rius } from "~/db/schema";
import { TASK_NAMES } from "../constants";

export default defineTask({
  meta: {
    name: TASK_NAMES.RIUS_ROTATE,
    description: "Rotate RIUs: archive active, activate upcoming, create new upcoming",
  },
  async run() {
    console.log("[rius:rotate] Starting RIU rotation...");

    // Archive the currently active RIU
    const archivedResult = await db
      .update(rius)
      .set({ status: "archived" })
      .where(eq(rius.status, "active"))
      .returning();

    console.log(
      `[rius:rotate] Archived ${archivedResult.length} active RIU(s)`,
    );

    // Promote upcoming RIU to active
    const activatedResult = await db
      .update(rius)
      .set({ status: "active" })
      .where(eq(rius.status, "upcoming"))
      .returning();

    console.log(
      `[rius:rotate] Activated ${activatedResult.length} upcoming RIU(s)`,
    );

    // Create a new upcoming RIU
    const [newRiu] = await db
      .insert(rius)
      .values({ status: "upcoming" })
      .returning();

    console.log(`[rius:rotate] Created new upcoming RIU with id: ${newRiu.id}`);

    return {
      result: {
        success: true,
        archived: archivedResult.length,
        activated: activatedResult.length,
        newRiuId: newRiu.id,
      },
    };
  },
});
