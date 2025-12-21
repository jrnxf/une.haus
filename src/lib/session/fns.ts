import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { zodValidator } from "@tanstack/zod-adapter";

import { useServerSession } from "~/lib/session/hooks";
import {
  hausSessionSchema,
  setFlashSchema,
  setSidebarSchema,
  setThemeSchema,
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

    const deviceType = getDeviceTypeServerFn();

    const sessionData = {
      ...parsedSession,
      deviceType,
      // return the flash
      flash,
    };

    return sessionData;
  },
);

export const setSessionFlashServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(setFlashSchema))
  .handler(async ({ data: input }) => {
    const session = await useServerSession();
    await session.update({ flash: input.message });
  });

export const clearSessionServerFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const session = await useServerSession();
    await session.clear();
  },
);

export const setSessionThemeServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(setThemeSchema))
  .handler(async ({ data: theme }) => {
    const session = await useServerSession();

    await session.update({
      ...session.data,
      theme,
    });
  });

export const setSessionSidebarServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(setSidebarSchema))
  .handler(async ({ data: sidebarOpen }) => {
    const session = await useServerSession();

    await session.update({
      ...session.data,
      sidebarOpen,
    });
  });

const getDeviceTypeServerFn = createServerOnlyFn((): "mobile" | "desktop" => {
  const headers = getRequestHeaders();

  // Client Hints (Chromium-based browsers)
  const uaMobile = headers.get("Sec-CH-UA-Mobile");
  if (uaMobile === "?1") {
    return "mobile";
  }

  // Fallback to User-Agent parsing (Safari, Firefox, etc.)
  const ua = headers.get("User-Agent") ?? "";
  if (
    /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  ) {
    return "mobile";
  }

  return "desktop";
});
