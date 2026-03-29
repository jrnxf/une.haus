import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router"
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { PageHeader } from "~/components/page-header"
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field"
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
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [code, setCode] = useState("")

  const enterCodeMutation = useMutation({
    mutationFn: auth.enterCode.fn,
    onSuccess: async (data) => {
      if (data.status === "success") {
        await queryClient.resetQueries({ queryKey: ["session.get"] })
        toast.success("welcome back to une.haus!")
        navigate({ to: search.redirect ?? "/auth/me" })
      } else if (data.status === "user_not_found") {
        await queryClient.resetQueries({ queryKey: ["session.get"] })
        navigate({ to: "/auth/register" })
      } else if (data.status === "invalid_code") {
        toast.error("invalid code")
        setCode("")
        requestAnimationFrame(() => inputRef.current?.focus())
      } else if (data.status === "expired") {
        toast.error("code has expired")
        setCode("")
        requestAnimationFrame(() => inputRef.current?.focus())
      }
    },
  })

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/auth">auth</PageHeader.Crumb>
          <PageHeader.Crumb>verify</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-xl p-4">
        <div className="bg-card space-y-4 rounded-xl border p-6">
          <Field>
            <FieldLabel>verify</FieldLabel>
            <FieldDescription>
              enter the 4-digit code sent to your email
            </FieldDescription>
            <InputOTP
              maxLength={4}
              pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
              value={code}
              onChange={setCode}
              onComplete={(value) =>
                enterCodeMutation.mutate({ data: { code: value } })
              }
              disabled={enterCodeMutation.isPending}
              autoComplete="off"
              autoFocus
              ref={inputRef}
            >
              <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border">
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          </Field>
          <p className="text-muted-foreground text-sm">
            didn&apos;t receive a code?{" "}
            <Link
              to="/auth"
              className="hover:text-primary underline underline-offset-4"
            >
              resend
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
