import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import { users } from "~/lib/users";
import { UserView } from "~/views/user";

export const Route = createFileRoute("/_authed/auth/me/")({
  staticData: {
    pageHeader: {
      breadcrumbs: [{ label: "profile" }],
      maxWidth: "2xl",
    },
  },
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

  return (
    <>
      <PageHeader>
        <PageHeader.Actions>
          <Button asChild variant="secondary">
            <Link to="/auth/me/edit">Edit</Link>
          </Button>
        </PageHeader.Actions>
      </PageHeader>
      <UserView user={data} />
    </>
  );
}
