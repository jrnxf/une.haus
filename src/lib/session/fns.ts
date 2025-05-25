import { createServerFn } from "@tanstack/react-start";
import { useServerSession } from "~/lib/session/hooks";
import { setFlashSchema, type HausSession } from "~/lib/session/schema";

export const getSessionServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<HausSession> => {
    const session = await useServerSession();

    // capture the flash
    const flash = session.data.flash;

    if (flash) {
      await session.update({ flash: undefined });
    }

    const sessionData = {
      ...session.data,
      // return the flash
      flash,
    };

    return sessionData;
  },
);

export const setFlashServerFn = createServerFn({
  method: "POST",
})
  .validator(setFlashSchema)
  .handler(async ({ data: input }) => {
    const session = await useServerSession();
    await session.update({ flash: input.message });
  });

export const clearSesslionServerFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const session = await useServerSession();
    await session.clear();
  },
);
