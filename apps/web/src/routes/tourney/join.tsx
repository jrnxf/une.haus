import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { PageHeader } from "~/components/page-header"
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "~/components/ui/input-otp"
import { tourney } from "~/lib/tourney"

export const Route = createFileRoute("/tourney/join")({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)

  const handleComplete = async (value: string) => {
    const upper = value.toUpperCase()
    setLoading(true)
    try {
      await tourney.get.fn({ data: { code: upper } })
      navigate({ to: "/tourney/$code/live", params: { code: upper } })
    } catch {
      toast.error("tournament not found")
      setCode("")
      setLoading(false)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tourney">tourney</PageHeader.Crumb>
          <PageHeader.Crumb>join</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="mx-auto w-full max-w-xl p-4">
        <div className="bg-card space-y-4 rounded-xl border p-6">
          <Field>
            <FieldLabel>join</FieldLabel>
            <FieldDescription>
              enter the 4-digit code to watch live
            </FieldDescription>
            <InputOTP
              maxLength={4}
              pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
              value={code}
              onChange={(v) => setCode(v.toUpperCase())}
              onComplete={handleComplete}
              disabled={loading}
              autoFocus
              autoComplete="off"
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
        </div>
      </div>
    </>
  )
}
