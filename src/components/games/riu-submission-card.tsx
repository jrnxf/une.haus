import { GameCard } from "./game-card"

type RiuSubmissionCardProps = {
  submission: {
    id: number
    user?: {
      id: number
      name: string
    }
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
  /**
   * Title the card with the submitter rather than the set. Use where the set is
   * already established by the surrounding page, so its name adds nothing.
   */
  showSubmitter?: boolean
  className?: string
}

export function RiuSubmissionCard({
  submission,
  set,
  showSubmitter,
  className,
}: RiuSubmissionCardProps) {
  const title = showSubmitter ? (submission.user?.name ?? set.name) : set.name

  return (
    <GameCard
      to="/games/rius/submissions/$submissionId"
      params={{ submissionId: submission.id }}
      className={className}
    >
      <GameCard.Row>
        <GameCard.Title>{title}</GameCard.Title>
        <GameCard.Stats
          likes={submission.likes}
          messages={submission.messages}
        />
      </GameCard.Row>
    </GameCard>
  )
}
