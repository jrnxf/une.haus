import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createFileRoute,
  redirect,
  useNavigate,
  useSearch,
} from "@tanstack/react-router"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { type z } from "zod"

import { PageHeader } from "~/components/page-header"
import { Button } from "~/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "~/components/ui/field"
import { Form } from "~/components/ui/form"
import { Input } from "~/components/ui/input"
import { Textarea } from "~/components/ui/textarea"
import { auth } from "~/lib/auth"
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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { session: sessionData } = useRootRouteContext()

  const registerMutation = useMutation({
    mutationFn: auth.register.fn,
    onSuccess: async () => {
      await queryClient.resetQueries({ queryKey: ["session.get"] })
      toast.success("welcome to une.haus!")
      navigate({ to: search.redirect ?? "/auth/me" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const registerForm = useForm<z.infer<typeof auth.register.schema>>({
    defaultValues: {
      name: "",
      bio: "",
    },
    resolver: zodResolver(auth.register.schema),
  })

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/auth">auth</PageHeader.Crumb>
          <PageHeader.Crumb>register</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-xl p-4">
        <Form
          rhf={registerForm}
          className="bg-card space-y-4 rounded-xl border p-6"
          id="main-content"
          onSubmit={(event) => {
            event.preventDefault()
            registerForm.handleSubmit((data) => {
              registerMutation.mutate({ data })
            })(event)
          }}
        >
          <p className="text-muted-foreground text-sm">
            registering as {sessionData.pendingEmail}
          </p>

          <Controller
            name="name"
            control={registerForm.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>name</FieldLabel>
                <FieldDescription>how you want to be known</FieldDescription>
                <Input {...field} autoFocus />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            name="bio"
            control={registerForm.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>bio</FieldLabel>
                <FieldDescription>
                  optional — tell us about you
                </FieldDescription>
                <Textarea {...field} />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <div className="flex flex-row-reverse">
            <Button disabled={registerMutation.isPending} type="submit">
              <span>register</span>
            </Button>
          </div>
        </Form>
      </div>
    </>
  )
}
