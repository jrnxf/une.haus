import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed")({
  beforeLoad: ({ context, location }) => {
    const session = context.session;
    if (!session.user) {
      throw redirect({
        to: "/auth",
        search: {
          redirect: location.href,
        },
      });
    }

    return {
      user: session.user,
    };
  },
  errorComponent: ({ error }) => {
    if (error.message === "Not authenticated") {
      return <p>You are not authenticated</p>;
    }

    throw error;
  },
});
