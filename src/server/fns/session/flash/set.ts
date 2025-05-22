import { createServerFn } from "@tanstack/react-start";
import { getWebRequest, setHeader } from "@tanstack/react-start/server";
import cookie from "cookie";

import { z } from "zod";
import {
  decrypt,
  encrypt,
  HAUS_SESSION_KEY,
  serializeSession,
} from "~/lib/session";

const schema = z.string();

const serverFn = createServerFn({
  method: "POST",
})
  .validator(schema)
  .handler(async ({ data: message }) => {
    const cookieHeader = getWebRequest()?.headers.get("cookie");
    const cookies = cookie.parse(cookieHeader ?? "");
    const decryptedSession = await decrypt(cookies[HAUS_SESSION_KEY]);

    const encryptedSession = await encrypt({
      ...decryptedSession,
      flash: message,
    });
    const session = await serializeSession(encryptedSession);

    setHeader("set-cookie", session);
    return message;
  });

export const setFlash = {
  schema,
  serverFn,
};
