import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { users } from "~/lib/users";
import { UserView } from "~/views/user";

export const Route = createFileRoute("/_authed/auth/me/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    const authUser = await context.queryClient.ensureQueryData(
      users.get.queryOptions({
        userId: context.user.id,
      }),
    );
    return {
      authUser,
    };
  },
});

function RouteComponent() {
  const { authUser } = Route.useLoaderData();

  const { data } = useSuspenseQuery(
    users.get.queryOptions({ userId: authUser.id }),
  );

  return <UserView user={data} />;
}
