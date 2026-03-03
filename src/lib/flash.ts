import { createIsomorphicFn } from "@tanstack/react-start"
import { toast } from "sonner"

import { useServerSession } from "~/lib/session/hooks"

export const flashMessage = createIsomorphicFn()
  .server(async (message: string) => {
    const session = await useServerSession()
    await session.update({ flash: message })
  })
  .client((message) => {
    toast.info(message)
  })
