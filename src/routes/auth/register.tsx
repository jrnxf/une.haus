import { createFileRoute, redirect } from "@tanstack/react-router";

import { z } from "zod";

import { UserForm } from "~/components/forms/user";
import { flashMessage } from "~/lib/flash";

const searchParamsSchema = z
  .object({
    flash: z.string().optional(),
    redirect: z.string().optional().default("/auth/me"),
  })
  .optional()
  .default({
    flash: undefined,
    redirect: "/auth/me",
  });

export const Route = createFileRoute("/auth/register")({
  component: RouteComponent,
  validateSearch: searchParamsSchema,
  loader: async ({ context }) => {
    if (context.session.user) {
      await flashMessage("You are already logged in");
      throw redirect({ to: "/auth/me" });
    }
  },
});

function RouteComponent() {
  // TODO use search
  // const search = useSearch({ from: "/auth/register" });

  return <UserForm />;
}
