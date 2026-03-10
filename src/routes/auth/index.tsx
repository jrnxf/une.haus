import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router"
import { Loader2Icon } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

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
import { auth } from "~/lib/auth"

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

export const Route = createFileRoute("/auth/")({
  component: RouteComponent,
  validateSearch: searchParamsSchema,
})

function RouteComponent() {
  const navigate = useNavigate()
  const search = useSearch({ from: "/auth/" })

  const sendCodeMutation = useMutation({
    mutationFn: auth.sendCode.fn,
    onSuccess: async () => {
      navigate({
        to: "/auth/verify",
        search: { redirect: search.redirect },
      })
    },
  })

  const sendCodeForm = useForm<z.infer<typeof auth.sendCode.schema>>({
    defaultValues: {
      email: "",
    },
    resolver: zodResolver(auth.sendCode.schema),
  })

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>auth</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-xl p-4">
        <Form
          rhf={sendCodeForm}
          className="bg-card space-y-4 rounded-xl border p-6"
          id="main-content"
          onSubmit={(event) => {
            event.preventDefault()
            sendCodeForm.handleSubmit((data) => {
              sendCodeMutation.mutate({ data })
            })(event)
          }}
        >
          <Controller
            name="email"
            control={sendCodeForm.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>email</FieldLabel>
                <FieldDescription>
                  we'll send you a verification code to log in or register
                </FieldDescription>
                <Input {...field} autoFocus />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <div className="flex flex-row-reverse items-center justify-between">
            <Button
              disabled={sendCodeMutation.isPending}
              iconLeft={
                sendCodeMutation.isPending && (
                  <Loader2Icon className="size-4 animate-spin" />
                )
              }
              type="submit"
            >
              <span>
                {sendCodeMutation.isPending ? "sending code" : "send code"}
              </span>
            </Button>

            <Button variant="link" type="button" asChild>
              <Link to="/auth/verify">have a code?</Link>
            </Button>
          </div>
        </Form>
      </div>
    </>
  )
}
