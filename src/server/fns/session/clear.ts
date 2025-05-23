import { createServerFn } from "@tanstack/react-start";

import { useServerSession } from "~/lib/session";

export const clearSession = createServerFn({ method: "POST" }).handler(
  async () => {
    const session = await useServerSession();
    await session.clear();
  },
);
