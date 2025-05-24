import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { useTRPC } from "~/integrations/trpc/react";
import { setFlash } from "~/server/fns/session/flash/set";
import { getUser } from "~/server/fns/users/get";

import { UserView } from "~/views/user";

export const Route = createFileRoute("/users/$userId")({
  component: RouteComponent,
  params: {
    parse: z.object({
      userId: z.coerce.number(),
    }).parse,
  },
  loader: async ({ context, params: { userId } }) => {
    try {
      await context.queryClient.ensureQueryData(
        getUser.queryOptions({ userId }),
      );
    } catch (error) {
      await setFlash({ data: error.message });
      throw redirect({ to: "/users" });
    }
  },
});

function RouteComponent() {
  const trpc = useTRPC();

  const { userId } = Route.useParams();
  const { data } = useSuspenseQuery(trpc.user.get.queryOptions({ userId }));

  return <UserView user={data} />;
}
