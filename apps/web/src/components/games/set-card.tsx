import { GameCard } from "./game-card"

type SetCardProps = {
  set: {
    id: number
    name: string
    instructions: string | null
    createdAt: Date
    user: {
      id: number
      name: string
      avatarId: string | null
    }
    likes?: unknown[]
    messages?: unknown[]
    submissions?: unknown[]
  }
  className?: string
  showStats?: boolean
}

export function SetCard({ set, className, showStats = true }: SetCardProps) {
  return (
    <GameCard
      to="/games/rius/sets/$setId"
      params={{ setId: set.id }}
      className={className}
    >
      <GameCard.Row>
        <GameCard.Title>{set.name}</GameCard.Title>
        {showStats && (
          <GameCard.Stats likes={set.likes} messages={set.messages} />
        )}
      </GameCard.Row>
    </GameCard>
  )
}
