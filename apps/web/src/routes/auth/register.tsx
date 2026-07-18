import { createFileRoute, redirect, useSearch } from "@tanstack/react-router"

import { UserForm } from "~/components/forms/user"
import { PageHeader } from "~/components/page-header"
import { authSearchSchema } from "~/lib/auth/schemas"
import { useRootRouteContext } from "~/lib/session/hooks"
import { session } from "~/lib/session/index"

export const Route = createFileRoute("/auth/register")({
  component: RouteComponent,
  validateSearch: authSearchSchema,
  loader: async ({ context }) => {
    if (context.session.user) {
      await session.flash.set.fn({
        data: { type: "info", message: "you are already logged in" },
      })
      throw redirect({ to: "/auth/me" })
    }
    // Registration is only reachable with an email verified via enterCode.
    if (!context.session.pendingEmail) {
      throw redirect({ to: "/auth" })
    }
  },
})

function RouteComponent() {
  const search = useSearch({ from: "/auth/register" })
  const { session: sessionData } = useRootRouteContext()

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/auth">auth</PageHeader.Crumb>
          <PageHeader.Crumb>register</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-3xl flex-col gap-4 p-4">
        <UserForm
          mode="register"
          redirectTo={search.redirect}
          pendingEmail={sessionData.pendingEmail}
        />
      </div>
    </>
  )
}
