import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import { useSessionUser } from "~/lib/session/hooks";
import { session } from "~/lib/session/index";
import { users } from "~/lib/users";
import { errorFmt } from "~/lib/utils";
import { UserView } from "~/views/user";

export const Route = createFileRoute("/users/$userId/")({
  component: RouteComponent,
  params: users.get.schema,
  loader: async ({ context, params: { userId } }) => {
    try {
      await Promise.all([
        context.queryClient.ensureQueryData(users.get.queryOptions({ userId })),
        context.queryClient.ensureInfiniteQueryData(
          users.activity.infiniteQueryOptions({ userId }),
        ),
      ]);
    } catch (error) {
      await session.flash.set.fn({ data: { message: errorFmt(error) } });
      throw redirect({ to: "/users" });
    }
  },
});

function RouteComponent() {
  const { userId } = Route.useParams();
  const { data } = useSuspenseQuery(users.get.queryOptions({ userId }));
  const sessionUser = useSessionUser();
  const isOwnProfile = sessionUser?.id === data.id;

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/users">users</PageHeader.Crumb>
          <PageHeader.Crumb>{data.name}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        {isOwnProfile && (
          <PageHeader.Right>
            <PageHeader.Actions>
              <Button asChild>
                <Link to="/auth/me/edit">Edit</Link>
              </Button>
            </PageHeader.Actions>
          </PageHeader.Right>
        )}
      </PageHeader>
      <UserView user={data} />
    </>
  );
}
