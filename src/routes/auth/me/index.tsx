import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { invariant } from "~/lib/invariant";
import { useSessionUser } from "~/lib/session";
import { users } from "~/lib/users";
import { UserView } from "~/views/user";

export const Route = createFileRoute("/auth/me/")({
  component: RouteComponent,
  loader: async ({ context, location }) => {
    const sessionUser = context.session.user;
    console.log("sessionUser in auth me", sessionUser);
    if (!sessionUser) {
      throw redirect({
        to: "/auth/login",
        search: { redirect: location.href },
      });
    }
    await context.queryClient.ensureQueryData(
      users.get.queryOptions({
        userId: sessionUser.id,
      }),
    );
  },
});

function RouteComponent() {
  const sessionUser = useSessionUser();
  invariant(sessionUser, "Authentication required");

  const { data } = useSuspenseQuery(
    users.get.queryOptions({ userId: sessionUser.id }),
  );

  return <UserView user={data} />;
}
