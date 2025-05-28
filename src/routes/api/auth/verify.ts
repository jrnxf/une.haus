import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";

import { eq } from "drizzle-orm";

import { db } from "~/db";
import { magicLinks, users } from "~/db/schema";
import { useServerSession } from "~/lib/session/hooks";

export const APIRoute = createAPIFileRoute("/api/auth/verify")({
  GET: async ({ request }) => {
    const url = new URL(request.url);

    const token = url.searchParams.get("token");

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
          Location: "/auth",
        },
      });
    }

    const session = await useServerSession();

    await session.update({
      user: magicLink.user,
    });

    return new Response(null, {
      status: 307,
      headers: {
        Location: redirectTo,
      },
    });
  },
});
