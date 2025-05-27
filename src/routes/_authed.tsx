import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed")({
  beforeLoad: ({ context }) => {
    console.log("in _authed beforeLoad");
    if (!context.session.user) {
      throw new Error("Not authenticated");
    }
  },
  errorComponent: ({ error }) => {
    if (error.message === "Not authenticated") {
      return <p>You are not authenticated</p>;
    }

    throw error;
  },
});
