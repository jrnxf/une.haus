import { invariant, redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";

import { useServerSession } from "~/lib/session/hooks";

export const adminOnlyMiddleware = createMiddleware().server(
  async ({ next }) => {
    const session = await useServerSession();

    if (!session.data.user) {
      throw redirect({ to: "/auth" });
    }

    invariant(session.data.user.id === 1, "User is not an admin");

    return next({
      context: {
        user: session.data.user,
      },
    });
  },
);

export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const session = await useServerSession();

  if (!session.data.user) {
    throw redirect({ to: "/auth" });
  }

  return next({
    context: {
      user: session.data.user,
    },
  });
});

export const authOptionalMiddleware = createMiddleware().server(
  async ({ next }) => {
    const session = await useServerSession();

    return next({
      context: {
        user: session.data.user,
      },
    });
  },
);
