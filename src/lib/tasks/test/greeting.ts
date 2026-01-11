import { defineTask } from "nitro/task";

import { TASK_NAMES } from "../constants";

export default defineTask({
  meta: {
    name: TASK_NAMES.TEST_GREETING,
    description: "Test task that logs a greeting with timestamp",
  },
  run() {
    const now = new Date().toISOString();
    console.log(`[test:greeting] Hello! The time is ${now}`);
    return { result: { greeting: "Hello!", timestamp: now } };
  },
});
