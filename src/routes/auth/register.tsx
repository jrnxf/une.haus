import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { UserForm } from "~/components/forms/user"
import { PageHeader } from "~/components/page-header"
import { flashMessage } from "~/lib/flash"

const searchParamsSchema = z
  .object({
    flash: z.string().optional(),
    redirect: z.string().optional().default("/auth/me"),
  })
  .optional()
  .default({
    flash: undefined,
    redirect: "/auth/me",
  })

export const Route = createFileRoute("/auth/register")({
  component: RouteComponent,
  validateSearch: searchParamsSchema,
  loader: async ({ context }) => {
    if (context.session.user) {
      await flashMessage("You are already logged in")
      throw redirect({ to: "/auth/me" })
    }
  },
})

function RouteComponent() {
  // TODO use search
  // const search = useSearch({ from: "/auth/register" });

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/auth">auth</PageHeader.Crumb>
          <PageHeader.Crumb>register</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-5xl flex-col gap-4 p-4">
        <UserForm />
      </div>
    </>
  )
}
