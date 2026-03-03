import confetti from "canvas-confetti"
import { useEffect, useRef, useState } from "react"

const colors = [
  "#ff6b6b",
  "#ff8c42",
  "#ffd93d",
  "#6bcb77",
  "#4ecdc4",
  "#45b7d1",
  "#4ea8de",
  "#5e60ce",
  "#7950f2",
  "#9775fa",
  "#c084fc",
  "#f472b6",
  "#fb7185",
]

export function useChampionCelebration(champion: string | null) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const confettiRef = useRef<confetti.CreateTypes | null>(null)
  const [celebrationDismissed, setCelebrationDismissed] = useState(false)
  const [prevChampion, setPrevChampion] = useState<string | null | undefined>(
    undefined,
  )
  const prevChampionForConfettiRef = useRef<string | null | undefined>(
    undefined,
  )

  useEffect(() => {
    if (canvasRef.current && !confettiRef.current) {
      confettiRef.current = confetti.create(canvasRef.current, {
        resize: true,
      })
    }
  }, [])

  if (champion !== prevChampion) {
    if (prevChampion !== undefined && champion && champion !== "BYE") {
      setCelebrationDismissed(false)
    }
    setPrevChampion(champion)
  }

  const showCelebration =
    !!champion && champion !== "BYE" && !celebrationDismissed

  useEffect(() => {
    const fireConfetti = confettiRef.current
    if (prevChampionForConfettiRef.current === undefined) {
      prevChampionForConfettiRef.current = champion
      return
    }
    if (
      champion &&
      champion !== "BYE" &&
      champion !== prevChampionForConfettiRef.current &&
      fireConfetti
    ) {
      prevChampionForConfettiRef.current = champion
      fireConfetti({
        particleCount: 80,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors,
      })
    } else if (!champion) {
      prevChampionForConfettiRef.current = null
    }
  }, [champion])

  return {
    canvasRef,
    showCelebration,
    dismissCelebration: () => setCelebrationDismissed(true),
    showCelebrationAgain: () => setCelebrationDismissed(false),
  }
}
