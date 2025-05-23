import { createServerFn } from "@tanstack/react-start";

import { z } from "zod";
import { useServerSession } from "~/lib/session";

export const setFlash = createServerFn({
  method: "POST",
})
  .validator(z.string())
  .handler(async ({ data: message }) => {
    const session = await useServerSession();
    await session.update({ flash: message });
  });
