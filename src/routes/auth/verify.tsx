import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router"
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp"
import { Loader2Icon } from "lucide-react"
import { useRef } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "~/components/ui/input-otp"
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

export const Route = createFileRoute("/auth/verify")({
  component: RouteComponent,
  validateSearch: searchParamsSchema,
})

function RouteComponent() {
  const search = useSearch({ from: "/auth/verify" })

  const inputOTPRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const enterCodeForm = useForm<z.infer<typeof auth.enterCode.schema>>({
    defaultValues: {
      code: "",
    },
    resolver: zodResolver(auth.enterCode.schema),
  })

  const enterCodeMutation = useMutation({
    mutationFn: auth.enterCode.fn,
    onSuccess: async (data) => {
      if (data.status === "success") {
        await Promise.all([
          queryClient.resetQueries({ queryKey: ["session.get"] }),
          queryClient.resetQueries({ queryKey: ["presence.online"] }),
        ])
        toast.success("welcome back to une.haus!")
        navigate({ to: search.redirect ?? "/auth/me" })
      } else if (data.status === "user_not_found") {
        await Promise.all([
          queryClient.resetQueries({ queryKey: ["session.get"] }),
          queryClient.resetQueries({ queryKey: ["presence.online"] }),
        ])
        navigate({ to: "/auth/register" })
      }
    },
    onError: () => {
      enterCodeForm.setError("code", { message: "invalid code" })
      enterCodeForm.setValue("code", "")
      inputOTPRef.current?.focus()
    },
  })

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/auth">auth</PageHeader.Crumb>
          <PageHeader.Crumb>verify</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-xl p-4">
        <Form
          rhf={enterCodeForm}
          className="bg-card space-y-4 rounded-xl border p-6"
          id="main-content"
          onSubmit={(event) => {
            event.preventDefault()
            enterCodeForm.handleSubmit(async (data) => {
              await enterCodeMutation.mutateAsync({ data })
            })(event)
          }}
        >
          <Controller
            name="code"
            control={enterCodeForm.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>enter verification code</FieldLabel>
                <FieldDescription>
                  we sent a 4-digit code to your email
                </FieldDescription>
                <InputOTP
                  maxLength={4}
                  {...field}
                  pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                  autoComplete="off"
                  autoFocus
                  ref={inputOTPRef}
                >
                  <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border">
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <div className="flex flex-row-reverse items-center justify-between">
            <Button
              disabled={enterCodeMutation.isPending}
              iconLeft={
                enterCodeMutation.isPending && (
                  <Loader2Icon className="size-4 animate-spin" />
                )
              }
              type="submit"
            >
              <span>
                {enterCodeMutation.isPending ? "verifying" : "verify"}
              </span>
            </Button>
            <FieldDescription>
              didn&apos;t receive a code? <Link to="/auth">resend</Link>
            </FieldDescription>
          </div>
        </Form>
      </div>
    </>
  )
}
