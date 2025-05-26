import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { session } from "~/lib/session/index";
import { users } from "~/lib/users";
import { errorFmt } from "~/lib/utils";
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
      await session.flash.set.fn({ data: { message: errorFmt(error) } });
      throw redirect({ to: "/users" });
    }
  },
});

function RouteComponent() {
  const { userId } = Route.useParams();
  const { data } = useSuspenseQuery(users.get.queryOptions({ userId }));

  return <UserView user={data} />;
}
