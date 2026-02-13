import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { PageHeader } from "~/components/page-header";
import { session } from "~/lib/session/index";
import { users } from "~/lib/users";
import { errorFmt } from "~/lib/utils";
import { UserView } from "~/views/user";

export const Route = createFileRoute("/users/$userId/")({
  component: RouteComponent,
  params: users.get.schema,
  loader: async ({ context, params: { userId } }) => {
    try {
      const [y] = await Promise.all([
        context.queryClient.ensureQueryData(users.get.queryOptions({ userId })),
        context.queryClient.ensureInfiniteQueryData(
          users.activity.infiniteQueryOptions({ userId }),
        ),
      ]);

      return y;
    } catch (error) {
      await session.flash.set.fn({ data: { message: errorFmt(error) } });
      throw redirect({ to: "/users" });
    }
  },
});

function RouteComponent() {
  const { userId } = Route.useParams();
  const { data } = useSuspenseQuery(users.get.queryOptions({ userId }));

  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/users">users</PageHeader.Crumb>
          <PageHeader.Crumb>{data.name}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <UserView user={data} />
    </>
  );
}
