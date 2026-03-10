import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { PageHeader } from "~/components/page-header"
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
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tourney">tourney</PageHeader.Crumb>
          <PageHeader.Crumb>join</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-xs space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">join tourney</h1>
            <p className="text-muted-foreground text-sm">
              enter the 4-digit code to watch live
            </p>
          </div>

          <div className="flex justify-center">
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
          </div>
        </div>
      </div>
    </>
  )
}
