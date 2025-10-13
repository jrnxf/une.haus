import { createServerFn } from "@tanstack/react-start";

import { useServerSession } from "~/lib/session/hooks";
import {
  hausSessionSchema,
  setFlashSchema,
  type HausSession,
} from "~/lib/session/schema";

export const getSessionServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<HausSession> => {
    const session = await useServerSession();

    const parsedSession = hausSessionSchema.parse(session.data);

    // capture the flash
    const flash = parsedSession.flash;

    if (flash) {
      await session.update({ flash: undefined });
    }

    const sessionData = {
      ...parsedSession,
      // return the flash
      flash,
    };

    return sessionData;
  },
);

export const setFlashServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(setFlashSchema)
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

export const toggleThemeServerFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const session = await useServerSession();

    console.log("session.data.theme", session.data.theme);
    await session.update({
      theme: session.data.theme === "light" ? "dark" : "light",
    });
  },
);
