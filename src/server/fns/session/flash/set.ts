import { createServerFn } from "@tanstack/react-start";

import { z } from "zod";
import { useServerSession } from "~/lib/session";

const schema = z.string();

const serverFn = createServerFn({
  method: "POST",
})
  .validator(schema)
  .handler(async ({ data: message }) => {
    const session = await useServerSession();
    await session.update({ flash: message });
  });

export const setFlash = {
  schema,
  serverFn,
};
