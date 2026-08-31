import { Link, type LinkProps } from "@tanstack/react-router"
import { HeartIcon, MessageCircleIcon } from "lucide-react"
import { type ReactNode } from "react"

import { Button } from "~/components/ui/button"
import { Metaline } from "~/components/ui/metaline"
import { StatBadge } from "~/components/ui/stat-badge"
import { cn } from "~/lib/utils"

function arrayLen(arr?: unknown[]): number {
  return Array.isArray(arr) ? arr.length : 0
}

// --- Root ---

type GameCardProps = {
  to: LinkProps["to"]
  params: LinkProps["params"]
  className?: string
  children: ReactNode
}

function GameCardRoot({ to, params, className, children }: GameCardProps) {
  return (
    <div className={cn("group relative", className)}>
      <Button variant="card" className="flex w-full min-w-0 p-3" asChild>
        <Link to={to} params={params}>
          {children}
        </Link>
      </Button>
    </div>
  )
}

// --- Layout ---

function GameCardRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-4">
      {children}
    </div>
  )
}

function GameCardContent({ children }: { children: ReactNode }) {
  return <div className="min-w-0 flex-1 space-y-1">{children}</div>
}

// --- Title ---

function GameCardTitle({ children }: { children: ReactNode }) {
  return <div className="truncate text-sm font-medium">{children}</div>
}

// --- Meta ---

function GameCardMeta({
  parts,
  className,
}: {
  parts: ReactNode[]
  className?: string
}) {
  return <Metaline className={cn("text-xs", className)} parts={parts} />
}

// --- Stats ---

type GameCardStatsProps = {
  likes?: unknown[]
  messages?: unknown[]
}

function GameCardStats({ likes, messages }: GameCardStatsProps) {
  const likeCount = arrayLen(likes)
  const messageCount = arrayLen(messages)

  return (
    <div className="flex shrink-0 items-center gap-2 text-xs">
      <StatBadge icon={HeartIcon} count={likeCount} label="like" />
      <StatBadge
        icon={MessageCircleIcon}
        count={messageCount}
        label="message"
      />
    </div>
  )
}

// --- Compound export ---

export const GameCard = Object.assign(GameCardRoot, {
  Row: GameCardRow,
  Content: GameCardContent,
  Title: GameCardTitle,
  Meta: GameCardMeta,
  Stats: GameCardStats,
})
