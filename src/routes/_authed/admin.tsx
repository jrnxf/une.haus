import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { session } from "~/lib/session";

export const Route = createFileRoute("/_authed/admin")({
  beforeLoad: async ({ context }) => {
    const sessionData = await context.queryClient.ensureQueryData(
      session.get.queryOptions(),
    );

    // User ID 1 is admin
    if (!sessionData.user || sessionData.user.id !== 1) {
      throw redirect({ to: "/" });
    }

    return {
      user: sessionData.user,
    };
  },
  component: () => <Outlet />,
});
