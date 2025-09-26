import { createIsomorphicFn } from "@tanstack/react-start";

import { toast } from "sonner";

import { useServerSession } from "~/lib/session/hooks";

export const flashMessage = createIsomorphicFn()
  .server(async (message: string) => {
    const session = await useServerSession();
    console.log("server flash");
    await session.update({ flash: message + " (server)" });
  })
  .client((message) => {
    console.log("client flash");
    toast.info(message + " (client)");
  });
