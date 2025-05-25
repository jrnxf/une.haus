import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { users } from "~/lib/users";
import { setFlash } from "~/server/fns/session/flash/set";

import { UserView } from "~/views/user";

export const Route = createFileRoute("/users/$userId")({
  component: RouteComponent,
  params: users.get.schema,
  loader: async ({ context, params: { userId } }) => {
    try {
      await context.queryClient.ensureQueryData(
        users.get.queryOptions({ userId }),
      );
    } catch (error) {
      await setFlash({ data: error.message });
      throw redirect({ to: "/users" });
    }
  },
});

function RouteComponent() {
  const { userId } = Route.useParams();
  const { data } = useSuspenseQuery(users.get.queryOptions({ userId }));

  return <UserView user={data} />;
}
