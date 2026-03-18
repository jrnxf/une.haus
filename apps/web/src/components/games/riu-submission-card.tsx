import { GameCard } from "./game-card"

type RiuSubmissionCardProps = {
  submission: {
    id: number
    likes?: unknown[]
    messages?: unknown[]
  }
  set: {
    user: {
      id: number
      name: string
    }
    name: string
    instructions: string | null
  }
  className?: string
}

export function RiuSubmissionCard({
  submission,
  set,
  className,
}: RiuSubmissionCardProps) {
  return (
    <GameCard
      to="/games/rius/submissions/$submissionId"
      params={{ submissionId: submission.id }}
      className={className}
    >
      <GameCard.Row>
        <GameCard.Title>{set.name}</GameCard.Title>
        <GameCard.Stats
          likes={submission.likes}
          messages={submission.messages}
        />
      </GameCard.Row>
    </GameCard>
  )
}
