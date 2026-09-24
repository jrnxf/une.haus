import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { PageHeader } from "~/components/page-header"
import { TourneyCodeField } from "~/components/tourney/tourney-code-field"
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
          <TourneyCodeField
            value={code}
            onChange={setCode}
            onComplete={handleComplete}
            disabled={loading}
            ref={inputRef}
          />
        </div>
      </div>
    </>
  )
}
