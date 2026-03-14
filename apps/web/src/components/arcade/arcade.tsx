import { useCallback, useEffect, useRef, useState } from "react"

import {
  DEATH_FREEZE_FRAMES,
  DOUBLE_JUMP_FORCE,
  JUMP_CUT,
  JUMP_FORCE,
  PLAYER_X,
  WHEEL_R,
} from "./constants"
import { drawFrame } from "./draw"
import {
  createCloud,
  createInitialState,
  resetGameState,
  spawnDoubleJumpPuff,
} from "./helpers"
import { type GameState } from "./types"
import { updateGameState } from "./update"

// Fixed distance from the bottom of the canvas to the ground line.
// Height changes add/remove sky above; the ground stays anchored.
const GROUND_BOTTOM_OFFSET = 120

// Fixed timestep: physics always runs at 60fps regardless of display refresh rate
const FIXED_DT = 1000 / 120

export function UnicycleGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDead, setIsDead] = useState(false)
  const isDeadRef = useRef(false)
  const stateRef = useRef<GameState>(createInitialState())
  const animRef = useRef<number>(0)
  const colorsRef = useRef({
    fg: "#000",
    bg: "#fff",
    muted: "rgba(0,0,0,0.3)",
    frame: 0,
  })

  const syncDeadState = useCallback((nextIsDead: boolean) => {
    if (isDeadRef.current === nextIsDead) return
    isDeadRef.current = nextIsDead
    setIsDead(nextIsDead)
  }, [])

  const getGroundY = useCallback((canvas: HTMLCanvasElement) => {
    const dpr = window.devicePixelRatio || 1
    return canvas.height / dpr - GROUND_BOTTOM_OFFSET
  }, [])

  const resetGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    syncDeadState(false)
    resetGameState(stateRef.current, getGroundY(canvas))
    lastTimeRef.current = 0
    accumRef.current = 0
  }, [getGroundY, syncDeadState])

  const jump = useCallback(() => {
    const gs = stateRef.current
    if (!canvasRef.current) return

    if (gs.status === "idle") {
      resetGame()
      return
    }

    // Block input during death freeze countdown
    if (gs.status === "dead") {
      if (gs.deathFreezeTimer >= DEATH_FREEZE_FRAMES) {
        resetGame()
      }
      return
    }

    if (gs.isGrinding) {
      gs.velocityY = JUMP_FORCE
      gs.isAirborne = true
      gs.isGrinding = false
      gs.jumpHeld = true
    } else if (!gs.isAirborne) {
      gs.velocityY = JUMP_FORCE
      gs.isAirborne = true
      gs.jumpHeld = true
    } else if (gs.hasDoubleJump) {
      gs.velocityY = DOUBLE_JUMP_FORCE
      gs.hasDoubleJump = false
      gs.jumpHeld = true
      gs.seatSpinning = true
      gs.seatSpin = 0
      gs.seatSpinDir = Math.random() < 0.5 ? 1 : -1
      gs.dustParticles.push(...spawnDoubleJumpPuff(PLAYER_X, gs.playerY))
    }
  }, [resetGame])

  const releaseJump = useCallback(() => {
    const gs = stateRef.current
    if (gs.jumpHeld && gs.isAirborne && gs.velocityY < 0) {
      gs.velocityY *= JUMP_CUT
    }
    gs.jumpHeld = false
  }, [])

  const accumRef = useRef(0)
  const lastTimeRef = useRef(0)

  const gameLoop = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Bootstrap the first frame
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp

      // Clamp elapsed to avoid spiral of death after tab-away
      const elapsed = Math.min(timestamp - lastTimeRef.current, FIXED_DT * 4)
      lastTimeRef.current = timestamp
      accumRef.current += elapsed

      const gs = stateRef.current
      const dpr = window.devicePixelRatio || 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const w = canvas.width / dpr
      const h = canvas.height / dpr
      const baseGroundY = h - GROUND_BOTTOM_OFFSET

      // Run physics in fixed-size steps
      while (accumRef.current >= FIXED_DT) {
        updateGameState(gs, baseGroundY, w, () => syncDeadState(true))
        syncDeadState(gs.status === "dead")
        accumRef.current -= FIXED_DT
      }

      // Recompute colors every 60 frames
      const colors = colorsRef.current
      colors.frame++
      if (colors.frame % 60 === 1) {
        const styles = getComputedStyle(canvas)
        colors.fg = styles.getPropertyValue("color") || "#000"
        colors.bg = styles.getPropertyValue("background-color") || "#fff"
        const tmp = document.createElement("canvas")
        tmp.width = 1
        tmp.height = 1
        const tmpCtx = tmp.getContext("2d")!
        tmpCtx.fillStyle = colors.fg
        tmpCtx.fillRect(0, 0, 1, 1)
        const [r, g, b] = tmpCtx.getImageData(0, 0, 1, 1).data
        colors.muted = `rgba(${r},${g},${b},0.3)`
      }
      const { fg, bg, muted } = colors

      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      drawFrame(ctx, gs, w, h, baseGroundY, fg, bg, muted)

      animRef.current = requestAnimationFrame(gameLoop)
    },
    [syncDeadState],
  )

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const dpr = window.devicePixelRatio || 1
    const oldH = canvas.height / dpr
    const rect = container.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const newH = canvas.height / dpr
    const gs = stateRef.current
    if (gs.status === "idle") {
      gs.playerY = getGroundY(canvas) - WHEEL_R
    } else {
      // Ground moved by the same amount as the height change
      gs.playerY += newH - oldH
    }
  }, [getGroundY])

  useEffect(() => {
    resizeCanvas()
    const canvas = canvasRef.current
    if (canvas) {
      const dpr = window.devicePixelRatio || 1
      const logicalWidth = canvas.width / dpr
      stateRef.current.clouds = Array.from({ length: 3 }, () =>
        createCloud(logicalWidth),
      )
      stateRef.current.playerY = getGroundY(canvas) - WHEEL_R
    }

    animRef.current = requestAnimationFrame(gameLoop)
    const ro = new ResizeObserver(() => resizeCanvas())
    if (containerRef.current) ro.observe(containerRef.current)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault()
        jump()
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        releaseJump()
      }
    }
    globalThis.addEventListener("keydown", handleKeyDown)
    globalThis.addEventListener("keyup", handleKeyUp)
    return () => {
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
      globalThis.removeEventListener("keydown", handleKeyDown)
      globalThis.removeEventListener("keyup", handleKeyUp)
    }
  }, [gameLoop, getGroundY, jump, releaseJump, resizeCanvas])

  return (
    <div
      ref={containerRef}
      className="relative min-h-0 flex-1 cursor-pointer touch-none overflow-hidden select-none"
      style={{ WebkitTouchCallout: "none" }}
      onPointerDown={jump}
      onPointerUp={releaseJump}
      onPointerCancel={releaseJump}
    >
      <canvas
        ref={canvasRef}
        className="bg-background text-foreground absolute inset-0 h-full w-full"
      />
      {!isDead && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <p className="text-muted-foreground text-center font-mono text-xs md:hidden">
            <span className="inline-block">tap to jump /</span>{" "}
            <span className="inline-block">double tap to double jump</span>
          </p>
          <p className="text-muted-foreground hidden text-center font-mono text-xs md:block">
            <span className="inline-block">
              <kbd className="bg-muted rounded px-1.5 py-0.5">space</kbd> to
              jump /
            </span>{" "}
            <span className="inline-block">
              <kbd className="bg-muted rounded px-1.5 py-0.5">space space</kbd>{" "}
              to double jump
            </span>
          </p>
        </div>
      )}
      {isDead && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <p className="text-muted-foreground text-center font-mono text-xs">
            <span className="inline-block">want the real deal?</span>{" "}
            <span className="inline-block">
              play{" "}
              <a
                href="https://store.steampowered.com/app/2204900/STREET_UNI_X/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline"
                onPointerDown={(e) => e.stopPropagation()}
              >
                street uni x
              </a>{" "}
              instead
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
