import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed")({
  beforeLoad: ({ context, location }) => {
    console.log("in _authed beforeLoad");
    if (!context.session.user) {
      throw redirect({
        to: "/auth/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
  errorComponent: ({ error }) => {
    if (error.message === "Not authenticated") {
      return <p>You are not authenticated</p>;
    }

    throw error;
  },
});
