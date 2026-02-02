import { defineTask } from "nitro/task";

import { TASK_NAMES } from "~/lib/tasks/constants";

export default defineTask({
  meta: {
    name: TASK_NAMES.HEARTBEAT,
    description: "Heartbeat task that logs the current time every minute",
  },
  run() {
    const now = new Date().toISOString();
    console.log(`[heartbeat] ${now}`);
    return { result: { timestamp: now } };
  },
});
