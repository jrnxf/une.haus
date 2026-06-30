import { mock } from "bun:test"

// nitro's task runtime (`nitro/task`) statically imports this virtual module
// at module-eval time. nitro only generates it during a real build, so under
// plain `bun test` the import throws "Cannot find module". Stub it so task
// modules (which import `defineTask`) load — `defineTask` is a passthrough and
// needs nothing from this module.
mock.module("#nitro-internal-virtual/tasks", () => ({
  scheduledTasks: [],
  tasks: {},
}))
