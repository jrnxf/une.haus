import { submitFeedbackServerFn } from "~/lib/feedback/fns"
import { submitFeedbackSchema } from "~/lib/feedback/schemas"

export const feedback = {
  submit: {
    fn: submitFeedbackServerFn,
    schema: submitFeedbackSchema,
  },
}
