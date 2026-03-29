import { redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { Resend } from "resend"

import FeedbackTemplate from "../../../emails/feedback"
import { env } from "~/lib/env"
import { submitFeedbackSchema } from "~/lib/feedback/schemas"
import { useServerSession } from "~/lib/session/hooks"

const resendClient = new Resend(env.RESEND_API_KEY)

export const submitFeedbackServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(submitFeedbackSchema))
  .handler(async ({ data: input }) => {
    const session = await useServerSession()
    if (!session.data.user) throw redirect({ to: "/auth" })

    const { error } = await resendClient.emails.send({
      from: "une.haus feedback <colby@jrnxf.co>",
      to: ["colby@jrnxf.co"],
      subject: `feedback from ${session.data.user.name}`,
      react: FeedbackTemplate({
        userName: session.data.user.name,
        userEmail: session.data.user.email,
        content: input.content,
        media: input.media,
      }),
    })

    if (error) {
      console.error("Failed to send feedback email", error)
      throw new Error(error.message)
    }

    return { success: true }
  })
