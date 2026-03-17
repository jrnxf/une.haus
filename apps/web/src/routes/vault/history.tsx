import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import confetti from "canvas-confetti"
import { motion } from "framer-motion"
import pluralize from "pluralize"
import { useCallback, useEffect, useRef, useState } from "react"

import { PageHeader } from "~/components/page-header"
import { seo } from "~/lib/seo"
import { utv } from "~/lib/utv/core"

export const Route = createFileRoute("/vault/history")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(utv.claps.get.queryOptions())
  },
  head: () =>
    seo({
      title: "vault history",
      description: "the story of unicycle.tv",
      path: "/vault/history",
    }),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/vault">vault</PageHeader.Crumb>
          <PageHeader.Crumb>history</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
        <div className="bg-card space-y-4 rounded-lg border p-4">
          <div className="text-muted-foreground space-y-3 text-sm leading-relaxed lowercase">
            <p>
              In December 2005, Olaf Schlote launched{" "}
              <span className="text-foreground font-medium">unicycle.tv</span> —
              a pioneering video platform built specifically for the unicycling
              community. Before YouTube became mainstream and years before
              social media made video sharing effortless, unicycle.tv provided
              riders around the world a dedicated space to upload, share, and
              preserve their footage.
            </p>
            <p>
              The platform captured countless historic moments: competition
              runs, groundbreaking tricks, and the raw progression of urban
              riding. When videos disappeared from other platforms, unicycle.tv
              remained as an archive. This vault preserves that legacy.
            </p>
            <p className="text-foreground font-medium">
              We are deeply grateful to Olaf for his vision and the incredible
              contribution he made to documenting une history.
            </p>
          </div>

          <ClapButton />
        </div>
      </div>
    </>
  )
}

function ClapButton() {
  const qc = useQueryClient()
  const { data: serverCount } = useSuspenseQuery(utv.claps.get.queryOptions())
  const [localClicks, setLocalClicks] = useState(0)
  const pendingClicksRef = useRef(0)
  const isMutatingRef = useRef(false)
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const flushClicks = useCallback(async () => {
    if (isMutatingRef.current || pendingClicksRef.current === 0) return

    isMutatingRef.current = true
    const amount = pendingClicksRef.current
    pendingClicksRef.current = 0

    try {
      const newCount = await utv.claps.add.fn({ data: { amount } })
      qc.setQueryData(utv.claps.get.queryOptions().queryKey, newCount)
      setLocalClicks((c) => c - amount)
    } finally {
      isMutatingRef.current = false
      if (pendingClicksRef.current > 0) {
        flushClicks()
      }
    }
  }, [qc])

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (pendingClicksRef.current > 0 && !isMutatingRef.current) {
        utv.claps.add.fn({ data: { amount: pendingClicksRef.current } })
      }
    }
  }, [])

  const handleClick = () => {
    setLocalClicks((c) => c + 1)
    pendingClicksRef.current += 1

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const x = (rect.left + rect.width / 2) / window.innerWidth
      const y = (rect.top + rect.height / 2) / window.innerHeight

      confetti({
        particleCount: 6,
        spread: 40,
        origin: { x, y },
        shapes: ["circle"],
        colors: [
          "#ff6b6b",
          "#ff8c42",
          "#ffd93d",
          "#6bcb77",
          "#4ecdc4",
          "#45b7d1",
          "#7950f2",
          "#c084fc",
          "#f472b6",
        ],
        scalar: 0.8,
        gravity: 1.5,
        ticks: 40,
      })
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    debounceTimeoutRef.current = setTimeout(flushClicks, 500)
  }

  const displayCount = (serverCount ?? 0) + localClicks

  return (
    <div className="flex items-center gap-3">
      <motion.button
        ref={buttonRef}
        onClick={handleClick}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors"
      >
        <span className="text-base">👏</span>
        clap for olaf
      </motion.button>
      <span className="text-muted-foreground text-sm tabular-nums">
        {displayCount.toLocaleString()} {pluralize("clap", displayCount)}
      </span>
    </div>
  )
}
