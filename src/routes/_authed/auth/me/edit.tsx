import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { UserForm } from "~/components/forms/user";
import { users } from "~/lib/users";

export const Route = createFileRoute("/_authed/auth/me/edit")({
  component: RouteComponent,
  loader: async ({ context }) => {
    const authUser = await context.queryClient.ensureQueryData(
      users.get.queryOptions({ userId: context.user.id }),
    );
    return {
      authUser,
    };
  },
});

function RouteComponent() {
  const { authUser } = Route.useLoaderData();

  const { data: user } = useSuspenseQuery(
    users.get.queryOptions({ userId: authUser.id }),
  );

  return <UserForm user={user} />;
}
