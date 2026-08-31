import { GameCard } from "./game-card"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"

type ChainSetCardProps = {
  gameType: "bius" | "sius"
  set: {
    id: number
    name: string
    position: number
    createdAt: Date
    user: {
      id: number
      name: string
      avatarId: string | null
    }
    likes?: unknown[]
    messages?: unknown[]
    parentSet?: {
      id: number
      name: string
      user?: {
        id: number
        name: string
      }
    } | null
  }
  className?: string
}

const routes = {
  bius: "/games/bius/sets/$setId",
  sius: "/games/sius/sets/$setId",
} as const

export function ChainSetCard({ gameType, set, className }: ChainSetCardProps) {
  return (
    <GameCard
      to={routes[gameType]}
      params={{ setId: set.id }}
      className={className}
    >
      <GameCard.Content>
        <GameCard.Title>{set.name}</GameCard.Title>
        <div className="flex items-center justify-between gap-2">
          <GameCard.Meta
            className="relative z-10"
            parts={[
              set.user.name,
              <RelativeTimeCard
                key="created-at"
                className="text-xs"
                variant="muted"
                date={set.createdAt}
              />,
            ]}
          />
          <GameCard.Stats likes={set.likes} messages={set.messages} />
        </div>
      </GameCard.Content>
    </GameCard>
  )
}
