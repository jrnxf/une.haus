import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { setHeader } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";

import { db } from "~/db";
import { magicLinks, users } from "~/db/schema";
import { encrypt, serializeSession } from "~/lib/session";

export const APIRoute = createAPIFileRoute("/api/auth/verify")({
  GET: async ({ request }) => {
    const url = new URL(request.url);

    const token = url.searchParams.get("token");

    console.log(Object.fromEntries(url.searchParams.entries()));
    const redirectTo = url.searchParams.get("redirect") ?? "/auth/me";

    if (!token) {
      return json({ error: "No token" }, { status: 400 });
    }

    const [magicLink] = await db
      .select({
        id: magicLinks.id,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
          avatarUrl: users.avatarUrl,
          bio: users.bio,
          disciplines: users.disciplines,
        },
      })
      .from(magicLinks)
      .where(eq(magicLinks.id, token))
      .leftJoin(users, eq(users.email, magicLinks.email))
      .limit(1);

    if (!magicLink || !magicLink.user) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/auth/login",
        },
      });
    }

    const encryptedSession = await encrypt({ user: magicLink.user });
    const session = await serializeSession(encryptedSession);

    setHeader("set-cookie", session);

    return new Response(null, {
      status: 307,
      headers: {
        Location: redirectTo,
      },
    });
  },
});
