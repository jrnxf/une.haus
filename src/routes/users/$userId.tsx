import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { TRPCClientError } from "@trpc/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { useTRPC } from "~/integrations/trpc/react";
import { setFlash } from "~/server/fns/session/flash/set";

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
        context.trpc.user.get.queryOptions({
          userId,
        }),
      );
    } catch {
      await setFlash({ data: "User not found" });
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
